// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LSP8IdentifiableDigitalAsset} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8IdentifiableDigitalAsset.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./_event.sol";
import "./_error.sol";

/// @title Pepito Genesis 🐸
/// @author Aratta Labs
/// @notice Pepito Genesis Contract
/// @dev You will find the deployed contract addresses in the README.md file
/// @custom:security-contact atenyun@gmail.com
contract LSP8 is LSP8IdentifiableDigitalAsset("sample", "PEP", msg.sender, 2, 0) {
    using Counters for Counters.Counter;
    Counters.Counter public _tokenIdCounter;

    uint256 public constant MAX_SUPPLY = 2424;
    mapping(string => uint256) public price;
    address public pepito_vault;
    address[3] public team;
    uint256 public councilMintExpiration;
    uint8 vaultPercentage;
    bytes public rawMetadata;
    uint256 public teamMintCounter = 0;

    struct MintPool {
        address sender;
        bytes32 tokenId;
        uint256 dt;
        string referral;
    }

    MintPool[] public mintPool;

    constructor() {
        //address[3] memory _team
        // Initial metadata
        rawMetadata = unicode'{"LSP4Metadata":{"name":"PEPITO GENESIS","description":"Mint your PEPITO GENESIS NFT today to join us on an adventure into the world of PEPITO, 2424 PEPITO Spawn looking for a home. For more information check out our roadmap displayed on https://pepitolyx.com and anything else drop us a message on either CG or Twitter.","links":[{"title":"Website","url":"https://pepitolyx.com"},{"title":"Mint","url":"https://genesis.pepitolyx.com"},{"title":"Common Ground","url":"https://app.cg/c/Pepito"},{"title":"𝕏","url":"https://x.com/pepitolyx"},{"title":"Telegram","url":"https://t.me/pepitolyx"}],"attributes":[{"key":"Stage","value":"0"},{"key":"Type","value":"Spawn"},{"key":"Background","value":""},{"key":"Skin","value":""},{"key":"Eyes","value":""},{"key":"Tattoos","value":""},{"key":"Clothes","value":""},{"key":"Headgear","value":""},{"key":"Accessory","value":""}],"icon":[{"width":512,"height":512,"url":"ipfs://QmdrcEfQnWZhisc2bF4544xdJGHBQhWLaoGBXZSvrvSTxT","verification":{"method":"keccak256(bytes)","data":"0xeb14faa594192b57a2c4edb6ae212c1a6b3848409176e7c900141132d9902c85"}}],"backgroundImage":[],"assets":[],"images":[[{"width":500,"height":500,"url":"ipfs://QmY8Z5yaoSsTY8DnpcqryJSjt4s1ehktCtJd2pKAwv4JsW","verification":{"method":"keccak256(bytes)","data":"0x0f7ea5085e1ce038e3f51f97fa25434262b9d5808b1faf24bb41d6a289a92b20"}}]]}}';

        // Expire in 24h (10% discount)
        price["council_mint"] = 1.9 ether;
        price["public_mint"] = 2.11 ether;

        // Add vault percentage
        vaultPercentage = 40;

        team = [0xd64Deb40240209473f676945c2ed2bfA2CeF2B7d, 0x41be92E41B9d8E320330bad6607168aDB833fcD5, 0x0D5C8B7cC12eD8486E1E0147CC0c3395739F138d];
        pepito_vault = 0xC99Be60cC96631E9BEF68b7C68Fb7124E62F3EDF;

        // Set the council mint expiration
        councilMintExpiration = block.timestamp + 1 days;
       // emit PepitoCouncilMintStarted((block.timestamp + 1 days), price["council_mint"]);
    }

    function getMetadata() public view returns (bytes memory) {
        bytes memory verfiableURI = bytes.concat(hex"00006f357c6a0020", keccak256(rawMetadata), abi.encodePacked("data:application/json;base64,", Base64.encode(rawMetadata)));
        return verfiableURI;
    }

    ///@notice Public Mint
    function mintmint() public payable returns (bytes32[] memory tokenId) {
        _tokenIdCounter.increment();
        bytes32 _tokenId = bytes32(_tokenIdCounter.current());
        _mint({to: msg.sender, tokenId: _tokenId, force: true, data: ""});

        // Set LSP8 metadata
        _setDataForTokenId(_tokenId, 0x9afb95cacc9f95858ec44aa8c3b685511002e30ae54415823f406128b85b238e, getMetadata());
        return tokenId;
    }

    ///@notice Calculate percentage
    ///@param amount The total amount
    ///@param bps The precentage
    ///@return percentage
    function calcPercentage(uint256 amount, uint256 bps) public pure returns (uint256) {
        require((amount * bps) >= 100);
        return (amount * bps) / 100;
    }

    ///@notice Withdraw the balance from this contract to the owner's address
    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Failed");
    }

    ///@notice Transfer balance from this contract to input address
    function transferBalance(address payable _to, uint256 _amount) public onlyOwner {
        // Note that "to" is declared as payable
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Failed");
    }

    /// @notice Return the balance of this contract
    function getBalance() public view onlyOwner returns (uint256) {
        return address(this).balance;
    }
}
