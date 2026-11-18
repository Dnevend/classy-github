// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Test } from "forge-std/Test.sol";
import { ClassyPass } from "../src/ClassyPass.sol";
import { Base64 } from "@openzeppelin/contracts/utils/Base64.sol";
import { IERC721Errors } from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {
    IERC721Enumerable
} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract ClassyPassTest is Test {
    ClassyPass private pass;

    uint256 private constant SIGNER_PK = 0xA11CE;
    address private signer;

    address private alice;
    address private bob;

    uint256 private constant DEADLINE_OFFSET = 15 minutes;
    uint256 private deadline;

    bytes32 private constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    bytes32 private constant MINT_TYPEHASH =
        keccak256("Mint(address to,uint8 theme,bytes32 claimKey,uint256 deadline)");
    bytes32 private constant KEY_MAC = keccak256("mac-1");
    bytes32 private constant KEY_NES = keccak256("nes-1");
    bytes32 private constant KEY_WIN98 = keccak256("win98-1");
    bytes32 private constant KEY_TUI = keccak256("tui-1");

    function setUp() public {
        vm.warp(1_700_000_000);
        deadline = block.timestamp + DEADLINE_OFFSET;

        signer = vm.addr(SIGNER_PK);
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        pass = new ClassyPass(address(this), signer, "ipfs://contract");
        pass.setImageURI(0, "ipfs://mac");
        pass.setImageURI(1, "ipfs://nes");
        pass.setImageURI(2, "ipfs://win98");
        pass.setImageURI(3, "ipfs://tui");
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("ClassyGit Pass")),
                keccak256(bytes("1")),
                block.chainid,
                address(pass)
            )
        );
    }

    function _digest(address to, uint8 theme, bytes32 claimKey, uint256 deadline_)
        internal
        view
        returns (bytes32)
    {
        bytes32 structHash = keccak256(abi.encode(MINT_TYPEHASH, to, theme, claimKey, deadline_));
        return keccak256(abi.encodePacked("\x19\x01", _domainSeparator(), structHash));
    }

    function _sign(uint256 pk, address to, uint8 theme, bytes32 claimKey, uint256 deadline_)
        internal
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, _digest(to, theme, claimKey, deadline_));
        return abi.encodePacked(r, s, v);
    }

    function _mint(address to, uint8 theme, bytes32 claimKey) internal returns (uint256 tokenId) {
        uint256 before = pass.balanceOf(to);
        bytes memory sig = _sign(SIGNER_PK, to, theme, claimKey, deadline);
        pass.mintWithSignature(to, theme, claimKey, deadline, sig);
        assertEq(pass.balanceOf(to), before + 1);
        tokenId = pass.tokenOfOwnerByIndex(to, before);
    }

    // ---------------------------------------------------------------------
    // Minting and numbering
    // ---------------------------------------------------------------------

    function testMintMac() public {
        uint256 tokenId = _mint(alice, 0, KEY_MAC);

        assertEq(tokenId, 1);
        assertEq(pass.ownerOf(1), alice);
        assertEq(pass.themeOf(1), 0);
        assertEq(pass.serialOf(1), 1);
        assertEq(pass.nextSerial(0), 1);
        assertEq(pass.totalSupply(), 1);
    }

    function testMintAllThemes() public {
        assertEq(_mint(alice, 0, KEY_MAC), 1);
        assertEq(_mint(alice, 1, KEY_NES), 2213);
        assertEq(_mint(alice, 2, KEY_WIN98), 4425);
        assertEq(_mint(alice, 3, KEY_TUI), 6637);

        uint256[4] memory stats = pass.getStats();
        assertEq(stats[0], 1);
        assertEq(stats[1], 1);
        assertEq(stats[2], 1);
        assertEq(stats[3], 1);

        assertEq(pass.serialOf(2213), 1);
        assertEq(pass.serialOf(4425), 1);
        assertEq(pass.serialOf(6637), 1);
    }

    function testSerialWithinTheme() public {
        assertEq(_mint(alice, 0, keccak256("mac-a")), 1);
        assertEq(_mint(alice, 0, keccak256("mac-b")), 2);
        assertEq(_mint(alice, 1, keccak256("nes-a")), 2213);

        assertEq(pass.serialOf(1), 1);
        assertEq(pass.serialOf(2), 2);
        assertEq(pass.serialOf(2213), 1);
    }

    // ---------------------------------------------------------------------
    // Voucher validation
    // ---------------------------------------------------------------------

    function testReplayReverts() public {
        _mint(alice, 0, KEY_MAC);

        bytes memory sig = _sign(SIGNER_PK, alice, 0, KEY_MAC, deadline);
        vm.expectRevert(abi.encodeWithSelector(ClassyPass.ClaimAlreadyUsed.selector, KEY_MAC));
        pass.mintWithSignature(alice, 0, KEY_MAC, deadline, sig);
    }

    function testExpiredReverts() public {
        uint256 expired = block.timestamp - 1;
        bytes memory sig = _sign(SIGNER_PK, alice, 0, KEY_MAC, expired);

        vm.expectRevert(abi.encodeWithSelector(ClassyPass.Expired.selector, expired));
        pass.mintWithSignature(alice, 0, KEY_MAC, expired, sig);
    }

    function testWrongSignerReverts() public {
        bytes memory sig = _sign(0xB0B, alice, 0, KEY_MAC, deadline);

        vm.expectRevert(ClassyPass.InvalidSignature.selector);
        pass.mintWithSignature(alice, 0, KEY_MAC, deadline, sig);
    }

    function testInvalidThemeReverts() public {
        bytes memory sig = _sign(SIGNER_PK, alice, 4, KEY_MAC, deadline);

        vm.expectRevert(abi.encodeWithSelector(ClassyPass.InvalidTheme.selector, 4));
        pass.mintWithSignature(alice, 4, KEY_MAC, deadline, sig);
    }

    function testZeroRecipientReverts() public {
        bytes memory sig = _sign(SIGNER_PK, address(0), 0, KEY_MAC, deadline);

        vm.expectRevert(ClassyPass.InvalidRecipient.selector);
        pass.mintWithSignature(address(0), 0, KEY_MAC, deadline, sig);
    }

    function testClaimKeyIsGlobal() public {
        _mint(alice, 0, KEY_MAC);

        // A buggy server could try to reuse a claim key for another theme.
        bytes memory sig = _sign(SIGNER_PK, alice, 1, KEY_MAC, deadline);
        vm.expectRevert(abi.encodeWithSelector(ClassyPass.ClaimAlreadyUsed.selector, KEY_MAC));
        pass.mintWithSignature(alice, 1, KEY_MAC, deadline, sig);
    }

    function testMintRequiresImageURI() public {
        ClassyPass fresh = new ClassyPass(address(this), signer, "");
        bytes memory sig = _sign(SIGNER_PK, alice, 0, KEY_MAC, deadline);

        vm.expectRevert(abi.encodeWithSelector(ClassyPass.ImageURINotSet.selector, uint8(0)));
        fresh.mintWithSignature(alice, 0, KEY_MAC, deadline, sig);
    }

    function testDeadlineInclusive() public {
        uint256 exact = block.timestamp;
        bytes memory sig = _sign(SIGNER_PK, alice, 0, KEY_MAC, exact);

        pass.mintWithSignature(alice, 0, KEY_MAC, exact, sig);
        assertEq(pass.ownerOf(1), alice);
    }

    // ---------------------------------------------------------------------
    // Transfer and enumeration
    // ---------------------------------------------------------------------

    function testTransferWorks() public {
        uint256 tokenId = _mint(alice, 0, KEY_MAC);

        vm.prank(alice);
        pass.transferFrom(alice, bob, tokenId);

        assertEq(pass.ownerOf(tokenId), bob);
        assertEq(pass.balanceOf(alice), 0);
        assertEq(pass.balanceOf(bob), 1);
        assertEq(pass.tokenOfOwnerByIndex(bob, 0), tokenId);
    }

    function testTransferDoesNotAffectTokenURI() public {
        uint256 tokenId = _mint(alice, 0, KEY_MAC);
        string memory before = pass.tokenURI(tokenId);

        vm.prank(alice);
        pass.transferFrom(alice, bob, tokenId);

        assertEq(pass.tokenURI(tokenId), before);
    }

    function testPauseDoesNotBlockTransfers() public {
        uint256 tokenId = _mint(alice, 0, KEY_MAC);
        pass.pause();

        vm.prank(alice);
        pass.transferFrom(alice, bob, tokenId);

        assertEq(pass.ownerOf(tokenId), bob);
    }

    function testReentrancyCannotBypassClaimKey() public {
        ReentrantReceiver receiver = new ReentrantReceiver(pass);
        bytes memory sig = _sign(SIGNER_PK, address(receiver), 0, KEY_MAC, deadline);
        receiver.arm(KEY_MAC, deadline, sig);

        pass.mintWithSignature(address(receiver), 0, KEY_MAC, deadline, sig);

        assertEq(pass.balanceOf(address(receiver)), 1);
        assertEq(pass.nextSerial(0), 1);
        assertEq(pass.totalSupply(), 1);
    }

    // ---------------------------------------------------------------------
    // Metadata
    // ---------------------------------------------------------------------

    function testTokenURI() public {
        _mint(alice, 0, KEY_MAC);

        string memory expectedJson = string.concat(
            '{"name":"ClassyGit Pass - mac #1",',
            '"description":"A free commemorative pass for a ClassyGit site. Not an investment.",',
            '"image":"ipfs://mac",',
            '"external_url":"https://classygit.dev/nft",',
            '"attributes":[{"trait_type":"Theme","value":"mac"},',
            '{"trait_type":"Serial","value":1,"max_value":2212}]}'
        );
        string memory expected =
            string.concat("data:application/json;base64,", Base64.encode(bytes(expectedJson)));

        assertEq(pass.tokenURI(1), expected);
    }

    function testTokenURIForEachTheme() public {
        _mint(alice, 1, KEY_NES);

        string memory expectedJson = string.concat(
            '{"name":"ClassyGit Pass - nes #1",',
            '"description":"A free commemorative pass for a ClassyGit site. Not an investment.",',
            '"image":"ipfs://nes",',
            '"external_url":"https://classygit.dev/nft",',
            '"attributes":[{"trait_type":"Theme","value":"nes"},',
            '{"trait_type":"Serial","value":1,"max_value":2212}]}'
        );
        string memory expected =
            string.concat("data:application/json;base64,", Base64.encode(bytes(expectedJson)));

        assertEq(pass.tokenURI(2213), expected);
    }

    function testImageURIOnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        pass.setImageURI(0, "ipfs://hacked");
    }

    function testSetImageURIRejectsJSONBreakers() public {
        vm.expectRevert(ClassyPass.InvalidImageURI.selector);
        pass.setImageURI(0, 'ipfs://a"b');

        vm.expectRevert(ClassyPass.InvalidImageURI.selector);
        pass.setImageURI(0, "ipfs://a\\b");

        vm.expectRevert(ClassyPass.InvalidImageURI.selector);
        pass.setImageURI(0, "ipfs://a\nb");

        vm.expectRevert(ClassyPass.InvalidImageURI.selector);
        pass.setImageURI(0, "");

        // Non-ASCII must be percent-encoded; raw UTF-8 is rejected.
        vm.expectRevert(ClassyPass.InvalidImageURI.selector);
        pass.setImageURI(0, unicode"ipfs://例子");
    }

    function testSetImageURIAcceptsValidURI() public {
        string memory uri = "ipfs://bafy.../mac%20card.png?x=1&y=2#frag";
        pass.setImageURI(0, uri);
        _mint(alice, 0, KEY_MAC);

        string memory expectedJson = string.concat(
            '{"name":"ClassyGit Pass - mac #1",',
            '"description":"A free commemorative pass for a ClassyGit site. Not an investment.",',
            '"image":"',
            uri,
            '",',
            '"external_url":"https://classygit.dev/nft",',
            '"attributes":[{"trait_type":"Theme","value":"mac"},',
            '{"trait_type":"Serial","value":1,"max_value":2212}]}'
        );
        string memory expected =
            string.concat("data:application/json;base64,", Base64.encode(bytes(expectedJson)));

        assertEq(pass.tokenURI(1), expected);
    }

    function testContractURI() public {
        assertEq(pass.contractURI(), "ipfs://contract");
        pass.setContractURI("ipfs://new-contract");
        assertEq(pass.contractURI(), "ipfs://new-contract");
    }

    function testEIP712Domain() public view {
        (
            ,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,,
        ) = pass.eip712Domain();

        assertEq(name, "ClassyGit Pass");
        assertEq(version, "1");
        assertEq(chainId, block.chainid);
        assertEq(verifyingContract, address(pass));
        assertEq(
            pass.MINT_TYPEHASH(),
            keccak256("Mint(address to,uint8 theme,bytes32 claimKey,uint256 deadline)")
        );
    }

    function testTokenURIRevertsForNonexistent() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, 1));
        pass.tokenURI(1);
    }

    function testCrossChainReplayReverts() public {
        bytes memory sig = _sign(SIGNER_PK, alice, 0, KEY_MAC, deadline);

        vm.chainId(84532);
        vm.expectRevert(ClassyPass.InvalidSignature.selector);
        pass.mintWithSignature(alice, 0, KEY_MAC, deadline, sig);
    }

    function testCrossContractReplayReverts() public {
        ClassyPass other = new ClassyPass(address(this), signer, "");
        other.setImageURI(0, "ipfs://mac");

        bytes memory sig = _sign(SIGNER_PK, alice, 0, KEY_MAC, deadline);
        vm.expectRevert(ClassyPass.InvalidSignature.selector);
        other.mintWithSignature(alice, 0, KEY_MAC, deadline, sig);
    }

    function testMalformedSignatureReverts() public {
        bytes memory sig = new bytes(64);

        vm.expectRevert(abi.encodeWithSelector(ECDSA.ECDSAInvalidSignatureLength.selector, 64));
        pass.mintWithSignature(alice, 0, KEY_MAC, deadline, sig);
    }

    // ---------------------------------------------------------------------
    // Pause and signer rotation
    // ---------------------------------------------------------------------

    function testPause() public {
        pass.pause();

        bytes memory sig = _sign(SIGNER_PK, alice, 0, KEY_MAC, deadline);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        pass.mintWithSignature(alice, 0, KEY_MAC, deadline, sig);

        pass.unpause();
        _mint(alice, 0, KEY_MAC);
        assertEq(pass.ownerOf(1), alice);
    }

    function testSetSigner() public {
        uint256 newPk = 0xB0B;
        address newSigner = vm.addr(newPk);
        pass.setSigner(newSigner);

        bytes memory oldSig = _sign(SIGNER_PK, alice, 0, KEY_MAC, deadline);
        vm.expectRevert(ClassyPass.InvalidSignature.selector);
        pass.mintWithSignature(alice, 0, KEY_MAC, deadline, oldSig);

        bytes memory newSig = _sign(newPk, alice, 0, KEY_MAC, deadline);
        pass.mintWithSignature(alice, 0, KEY_MAC, deadline, newSig);
        assertEq(pass.ownerOf(1), alice);
    }

    function testSetSignerRejectsZero() public {
        vm.expectRevert(ClassyPass.InvalidSigner.selector);
        pass.setSigner(address(0));
    }

    function testAdminOnlyOwner() public {
        vm.startPrank(alice);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        pass.setSigner(bob);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        pass.setContractURI("ipfs://x");

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        pass.pause();

        vm.stopPrank();
    }

    function testOwnable2Step() public {
        pass.transferOwnership(bob);
        assertEq(pass.owner(), address(this));
        assertEq(pass.pendingOwner(), bob);

        vm.prank(bob);
        pass.acceptOwnership();
        assertEq(pass.owner(), bob);
    }

    function testRenounceOwnershipDisabled() public {
        vm.expectRevert(ClassyPass.OwnershipRenounceDisabled.selector);
        pass.renounceOwnership();
    }

    // ---------------------------------------------------------------------
    // Supply cap
    // ---------------------------------------------------------------------

    function testSupplyCap() public {
        for (uint256 i = 0; i < pass.PER_THEME(); i++) {
            bytes32 claimKey = keccak256(abi.encode("cap", i));
            bytes memory sig = _sign(SIGNER_PK, alice, 0, claimKey, deadline);
            pass.mintWithSignature(alice, 0, claimKey, deadline, sig);
        }

        assertEq(pass.nextSerial(0), pass.PER_THEME());
        assertEq(pass.totalSupply(), pass.PER_THEME());

        uint256[4] memory left = pass.remaining();
        assertEq(left[0], 0);
        assertEq(left[1], 2212);

        bytes32 overflowKey = keccak256("overflow");
        bytes memory overflowSig = _sign(SIGNER_PK, alice, 0, overflowKey, deadline);
        vm.expectRevert(abi.encodeWithSelector(ClassyPass.SoldOut.selector, uint8(0)));
        pass.mintWithSignature(alice, 0, overflowKey, deadline, overflowSig);
    }

    function testTuiLastToken() public {
        for (uint256 i = 0; i < pass.PER_THEME(); i++) {
            bytes32 claimKey = keccak256(abi.encode("tui", i));
            bytes memory sig = _sign(SIGNER_PK, alice, 3, claimKey, deadline);
            pass.mintWithSignature(alice, 3, claimKey, deadline, sig);
        }

        assertEq(pass.nextSerial(3), pass.PER_THEME());
        assertEq(pass.ownerOf(8848), alice);
        assertEq(pass.themeOf(8848), 3);
        assertEq(pass.serialOf(8848), pass.PER_THEME());
    }

    // ---------------------------------------------------------------------
    // Interface and helpers
    // ---------------------------------------------------------------------

    function testSupportsInterfaces() public view {
        assertTrue(pass.supportsInterface(type(IERC721).interfaceId));
        assertTrue(pass.supportsInterface(type(IERC721Enumerable).interfaceId));
    }
}

/// @dev Tries to reenter mintWithSignature with the same claim key during
///      onERC721Received. The inner call must fail; the outer mint must succeed once.
contract ReentrantReceiver is IERC721Receiver {
    ClassyPass private immutable pass;

    bytes32 private claimKey;
    uint256 private deadline;
    bytes private signature;

    constructor(ClassyPass pass_) {
        pass = pass_;
    }

    function arm(bytes32 claimKey_, uint256 deadline_, bytes calldata signature_) external {
        claimKey = claimKey_;
        deadline = deadline_;
        signature = signature_;
    }

    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        try pass.mintWithSignature(address(this), 0, claimKey, deadline, signature) {
        // Should be unreachable: usedClaimKey is already true.
        }
            catch { }
        return IERC721Receiver.onERC721Received.selector;
    }
}
