// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

error Unauthorized();
error InsufficientBalance(uint256);
error NotAuthorizedAmount(uint256 totalAmount, uint256 authorizedAmount);
error NotOperator(address operator);
error DuplicatedListing(address collection, bytes32 tokenId);
