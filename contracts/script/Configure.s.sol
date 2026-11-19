// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console2 } from "forge-std/Script.sol";
import { ClassyPass } from "../src/ClassyPass.sol";

/// @notice Set the four theme images and the collection metadata after deploy.
///
/// Required env:
///   PRIVATE_KEY       owner key (the deployer by default)
///   CONTRACT_ADDRESS  deployed ClassyPass address
///   IMAGE_URI_MAC / IMAGE_URI_NES / IMAGE_URI_WIN98 / IMAGE_URI_TUI
///   CONTRACT_URI      collection metadata URI (optional but recommended)
contract Configure is Script {
    function run() external {
        uint256 ownerPk = vm.envUint("PRIVATE_KEY");
        address passAddress = vm.envAddress("CONTRACT_ADDRESS");

        ClassyPass pass = ClassyPass(passAddress);

        vm.startBroadcast(ownerPk);
        pass.setImageURI(0, vm.envString("IMAGE_URI_MAC"));
        pass.setImageURI(1, vm.envString("IMAGE_URI_NES"));
        pass.setImageURI(2, vm.envString("IMAGE_URI_WIN98"));
        pass.setImageURI(3, vm.envString("IMAGE_URI_TUI"));

        string memory contractURI = vm.envOr("CONTRACT_URI", string(""));
        if (bytes(contractURI).length > 0) {
            pass.setContractURI(contractURI);
        }
        vm.stopBroadcast();

        console2.log("Configured ClassyPass:", passAddress);
    }
}
