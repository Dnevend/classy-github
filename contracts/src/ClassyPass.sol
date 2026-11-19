// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Ownable2Step } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { Pausable } from "@openzeppelin/contracts/utils/Pausable.sol";
import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {
    ERC721Enumerable
} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { Base64 } from "@openzeppelin/contracts/utils/Base64.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

/// @title ClassyGit Pass
/// @notice Free, transferable commemorative cards for ClassyGit sites.
///         Four themes, 2212 cards each, 8848 total.
/// @dev Minting is authorized by an off-chain EIP-712 voucher signed by `signer`.
///      `claimKey` makes a (GitHub account, theme) pair unique on-chain without
///      storing the GitHub identity itself.
contract ClassyPass is ERC721Enumerable, EIP712, Ownable2Step, Pausable {
    using Strings for uint256;

    uint256 public constant PER_THEME = 2212;
    uint256 public constant TOTAL_SUPPLY = PER_THEME * 4;

    bytes32 public constant MINT_TYPEHASH =
        keccak256("Mint(address to,uint8 theme,bytes32 claimKey,uint256 deadline)");

    /// @notice Number of cards minted per theme. Theme order: mac, nes, win98, tui.
    uint256[4] public nextSerial;

    /// @notice Address allowed to authorize mints.
    address public signer;

    /// @notice One mint per claim key. Server derives it from (GitHub id, theme, salt).
    mapping(bytes32 claimKey => bool used) public usedClaimKey;

    /// @notice IPFS image for each theme.
    string[4] public imageURI;

    string private _contractURI;

    error InvalidRecipient();
    error InvalidTheme(uint8 theme);
    error InvalidSigner();
    error InvalidSignature();
    error Expired(uint256 deadline);
    error ClaimAlreadyUsed(bytes32 claimKey);
    error SoldOut(uint8 theme);
    error InvalidTokenId(uint256 tokenId);
    error InvalidImageURI();
    error ImageURINotSet(uint8 theme);
    error OwnershipRenounceDisabled();

    event Minted(
        address indexed to,
        uint8 indexed theme,
        uint256 indexed tokenId,
        uint256 serial,
        bytes32 claimKey
    );
    event SignerUpdated(address indexed signer);
    event ImageURIUpdated(uint8 indexed theme, string uri);
    event ContractURIUpdated(string uri);

    constructor(address initialOwner, address signer_, string memory contractURI_)
        ERC721("ClassyGit Pass", "CGP")
        EIP712("ClassyGit Pass", "1")
        Ownable(initialOwner)
    {
        if (signer_ == address(0)) revert InvalidSigner();
        signer = signer_;
        _contractURI = contractURI_;
        emit SignerUpdated(signer_);
        emit ContractURIUpdated(contractURI_);
    }

    // ---------------------------------------------------------------------
    // Minting
    // ---------------------------------------------------------------------

    /// @notice Mint one card for `to`.
    /// @param to Recipient of the card. The server signs vouchers only for
    ///        addresses that proved control off-chain.
    /// @param theme 0 = mac, 1 = nes, 2 = win98, 3 = tui.
    /// @param claimKey Opaque, server-derived key unique to (GitHub account, theme).
    /// @param deadline Unix timestamp after which the voucher is invalid.
    /// @param signature EIP-712 signature from `signer`.
    function mintWithSignature(
        address to,
        uint8 theme,
        bytes32 claimKey,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused {
        if (to == address(0)) revert InvalidRecipient();
        if (theme > 3) revert InvalidTheme(theme);
        if (bytes(imageURI[theme]).length == 0) revert ImageURINotSet(theme);
        if (block.timestamp > deadline) revert Expired(deadline);
        if (usedClaimKey[claimKey]) revert ClaimAlreadyUsed(claimKey);

        bytes32 structHash = keccak256(abi.encode(MINT_TYPEHASH, to, theme, claimKey, deadline));
        bytes32 digest = _hashTypedDataV4(structHash);
        if (ECDSA.recover(digest, signature) != signer) revert InvalidSignature();

        uint256 serial = ++nextSerial[theme];
        if (serial > PER_THEME) revert SoldOut(theme);
        usedClaimKey[claimKey] = true;

        uint256 tokenId = _startOf(theme) + serial - 1;
        _safeMint(to, tokenId);

        emit Minted(to, theme, tokenId, serial, claimKey);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    /// @notice Minted count per theme.
    function getStats() external view returns (uint256[4] memory) {
        return nextSerial;
    }

    /// @notice Remaining supply per theme.
    function remaining() external view returns (uint256[4] memory out) {
        for (uint8 i = 0; i < 4; i++) {
            out[i] = PER_THEME - nextSerial[i];
        }
    }

    function themeOf(uint256 tokenId) external view returns (uint8) {
        _requireOwned(tokenId);
        (uint8 theme,) = _locate(tokenId);
        return theme;
    }

    function serialOf(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        (, uint256 serial) = _locate(tokenId);
        return serial;
    }

    function contractURI() external view returns (string memory) {
        return _contractURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        (uint8 theme, uint256 serial) = _locate(tokenId);
        string memory themeName = _themeName(theme);
        string memory serialText = serial.toString();

        string memory json = string.concat(
            '{"name":"ClassyGit Pass - ',
            themeName,
            " #",
            serialText,
            '","description":"A free commemorative pass for a ClassyGit site. Not an investment.",',
            '"image":"',
            imageURI[theme],
            '",',
            '"external_url":"https://classygit.dev/nft",',
            '"attributes":[{"trait_type":"Theme","value":"',
            themeName,
            '"},{"trait_type":"Serial","value":',
            serialText,
            ',"max_value":',
            PER_THEME.toString(),
            "}]}"
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setSigner(address signer_) external onlyOwner {
        if (signer_ == address(0)) revert InvalidSigner();
        signer = signer_;
        emit SignerUpdated(signer_);
    }

    function setImageURI(uint8 theme, string calldata uri) external onlyOwner {
        if (theme > 3) revert InvalidTheme(theme);

        bytes memory data = bytes(uri);
        if (data.length == 0) revert InvalidImageURI();

        bool invalid = false;
        for (uint256 i = 0; i < data.length; i++) {
            uint8 value = uint8(data[i]);
            // Printable ASCII only: keeps the JSON UTF-8 valid and prevents
            // string terminators / escapes. Percent-encode anything else.
            if (value < 0x20 || value > 0x7e || value == 0x22 || value == 0x5c) {
                invalid = true;
                break;
            }
        }
        if (invalid) revert InvalidImageURI();

        imageURI[theme] = uri;
        emit ImageURIUpdated(theme, uri);
    }

    function setContractURI(string calldata uri) external onlyOwner {
        _contractURI = uri;
        emit ContractURIUpdated(uri);
    }

    /// @notice Disabled: renouncing ownership would permanently freeze the
    ///         signer and any unset theme image.
    function renounceOwnership() public view override onlyOwner {
        revert OwnershipRenounceDisabled();
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    function _startOf(uint8 theme) internal pure returns (uint256) {
        if (theme > 3) revert InvalidTheme(theme);
        return 1 + uint256(theme) * PER_THEME;
    }

    function _locate(uint256 tokenId) internal pure returns (uint8 theme, uint256 serial) {
        if (tokenId == 0 || tokenId > TOTAL_SUPPLY) revert InvalidTokenId(tokenId);
        uint256 index = tokenId - 1;
        // index < TOTAL_SUPPLY = 4 * PER_THEME, so the quotient fits in uint8.
        // forge-lint: disable-next-line(unsafe-typecast)
        theme = uint8(index / PER_THEME);
        serial = (index % PER_THEME) + 1;
    }

    function _themeName(uint8 theme) internal pure returns (string memory) {
        if (theme == 0) return "mac";
        if (theme == 1) return "nes";
        if (theme == 2) return "win98";
        return "tui";
    }
}
