// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

event Log(string message);
event FeeUpdated(uint256);
event NewTokenListed(address indexed _collection, bytes32 indexed tokenId, address token,uint256 price, address indexed sender, uint256 dt, bool status);
event CancelListing(address indexed _collection,bytes32 indexed  tokenId, address  token,uint256 price, address indexed sender, uint256 dt, bool status);
event SoldOut(address indexed _collection, bytes32 indexed  _tokenId, address token, uint256 price, address indexed from, address to,address referral, uint8 referralFee, uint256 dt);