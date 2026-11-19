// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ClassyPass} from "../src/ClassyPass.sol";

/// @notice Testnet smoke test: sign one voucher with SIGNER_PRIVATE_KEY and mint it.
///         Refuses to run on Base mainnet (chainId 8453).
contract MintTest is Script {
    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
    bytes32 private constant MINT_TYPEHASH =
        keccak256("Mint(address to,uint8 theme,bytes32 claimKey,uint256 deadline)");

    function run() external {
        require(block.chainid != 8453, "MintTest: mainnet disabled");

        uint256 signerPk = vm.envUint("SIGNER_PRIVATE_KEY");
        uint256 txPk = vm.envUint("PRIVATE_KEY");
        address passAddress = vm.envAddress("CONTRACT_ADDRESS");
        address to = vm.envAddress("MINT_TO");
        uint8 theme = uint8(vm.envOr("MINT_THEME", uint256(0)));

        // Test-only key: not derived from a GitHub account.
        bytes32 claimKey = keccak256(
            abi.encode("classygit-test-mint", block.chainid, to)
        );
        uint256 deadline = block.timestamp + 15 minutes;

        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256("ClassyGit Pass"),
                keccak256("1"),
                block.chainid,
                passAddress
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(MINT_TYPEHASH, to, theme, claimKey, deadline)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.startBroadcast(txPk);
        ClassyPass(passAddress).mintWithSignature(
            to,
            theme,
            claimKey,
            deadline,
            signature
        );
        vm.stopBroadcast();

        console2.log("Minted theme", theme, "to", to);
    }
}
