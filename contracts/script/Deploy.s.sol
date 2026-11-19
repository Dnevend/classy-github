// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { ClassyPass } from "../src/ClassyPass.sol";

/// @notice Deploy ClassyPass.
///
/// Required env:
///   PRIVATE_KEY      deployer private key
///   SIGNER_ADDRESS   address allowed to authorize mints (server signer)
///
/// Optional env:
///   OWNER_ADDRESS    initial owner (defaults to the deployer)
///   CONTRACT_URI     collection metadata URI (IPFS or https)
///
/// Example:
///   forge script script/Deploy.s.sol:Deploy \
///     --rpc-url "$BASE_RPC_URL" --broadcast --verify
contract Deploy is Script {
    function run() external returns (ClassyPass pass) {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address signer = vm.envAddress("SIGNER_ADDRESS");
        address owner = vm.envOr("OWNER_ADDRESS", vm.addr(deployerPk));
        string memory contractURI = vm.envOr("CONTRACT_URI", string(""));

        vm.startBroadcast(deployerPk);
        pass = new ClassyPass(owner, signer, contractURI);
        vm.stopBroadcast();

        console2.log("ClassyPass deployed at:", address(pass));
        console2.log("Owner:", owner);
        console2.log("Signer:", signer);
    }
}
