// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {_LSP4_TOKEN_TYPE_TOKEN, _LSP4_TOKEN_TYPE_COLLECTION, _LSP4_METADATA_KEY} from "@lukso/lsp4-contracts/contracts/LSP4Constants.sol";
import {ILSP8IdentifiableDigitalAsset as ILSP8} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/ILSP8IdentifiableDigitalAsset.sol";
import {ILSP7DigitalAsset as ILSP7} from "@lukso/lsp-smart-contracts/contracts/LSP7DigitalAsset/ILSP7DigitalAsset.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import "./_ownable.sol";
import "./_pausable.sol";
import "./_events.sol";
import "./_errors.sol";

/// @title UniTrade
/// @author Aratta Labs
/// @notice UniTrade
/// @dev You will find the deployed contract addresses in the repo
/// @custom:emoji 💸
/// @custom:security-contact atenyun@gmail.com
contract UniTrade is Ownable(msg.sender), Pausable {
    using Counters for Counters.Counter;
    Counters.Counter public _tradeCounter;

    // Fee
    uint8 public fee;

    struct ListingStruct {
        address token; // Purchase token
        uint256 price;
        uint8 referralFee;
        uint256 dt;
        bool status; // True: for sale | False: sold out and wait for new listing from the new owner
    }

    mapping(address => mapping(bytes32 => ListingStruct)) public listingPool;

    struct UserListingStruct {
        address collection;
        bytes32 tokenId;
        address token;
        uint256 price;
        uint8 referralFee;
        uint256 dt;
        bool status;
    }

    mapping(address => UserListingStruct[]) public userListingPool;

    struct TradeStruct {
        address collection;
        bytes32 tokenId;
        address token;
        uint256 price;
        address from;
        address to;
        address referral;
        uint8 referralFee;
        uint256 dt;
    }

    mapping(bytes32 => TradeStruct) public tradePool;

    constructor() {
        fee = 1;
    }

    /// @notice Update fee
    /// @dev Fee can be 0-100
    /// @param _fee new value
    function updateFee(uint8 _fee) public onlyOwner {
        assert(fee < 100);
        fee = _fee;
        emit FeeUpdated(_fee);
    }

    function transferToken(
        address _collection,
        bytes32 _tokenId,
        bool _force,
        bytes memory _data
    ) public returns (bool) {
        ILSP8 COLLECTION = ILSP8(_collection);
        // Transfer the token
        COLLECTION.transfer(address(COLLECTION.tokenOwnerOf(_tokenId)), _msgSender(), _tokenId, _force, _data);

        // Remove the token from listing
        listingPool[_collection][_tokenId] = ListingStruct(address(0), 0, 0, block.timestamp, false);

        return true;
    }

    function getListedTokens(address _seller) public view returns (uint256 len, UserListingStruct[] memory data) {
        return (userListingPool[_seller].length, userListingPool[_seller]);
    }

    function getTradePool(address _collection, bytes32 _tokenId) public view returns (TradeStruct[] memory, uint256 index) {
        uint256 totaShop = _tradeCounter.current();
        TradeStruct[] memory result = new TradeStruct[](1);

        uint256 foundedIndex;
        for (uint256 i = 0; i < totaShop; i++) {
            bytes32 itemId = bytes32(i + 1);
            if (tradePool[itemId].collection == _collection && tradePool[itemId].tokenId == _tokenId) {
                result[0] = TradeStruct(tradePool[itemId].collection, tradePool[itemId].tokenId, tradePool[itemId].token, tradePool[itemId].price, tradePool[itemId].from, tradePool[itemId].to, tradePool[itemId].referral, tradePool[itemId].referralFee, tradePool[itemId].dt);
                foundedIndex = i;
            }
        }

        return (result, foundedIndex);
    }

    // Is listed?
    function isListed(address _collection, bytes32 _tokenId) public view returns (bool) {
        return listingPool[_collection][_tokenId].status;
    }

    // tokenId: 0x0000000000000000000000000000000000000000000000000000000000000001
    // Token : 0x0000000000000000000000000000000000000000
    // Price: 1000000000000000000  = 1 ether

    ///@notice List
    ///@dev Relisting the token causes update only the fields
    function list(
        address _collection,
        bytes32 _tokenId,
        address _token,
        uint256 _price,
        uint8 _referralFee
    ) public whenNotPaused returns (bool) {
        ILSP8 COLLECTION = ILSP8(_collection);

        // Check owner of token
        if (COLLECTION.tokenOwnerOf(_tokenId) != _msgSender()) revert Unauthorized();

        // Make this contract an operator (authorizeOperator) so this contrct can transfer token to the buyer
        if (!COLLECTION.isOperatorFor(address(this), _tokenId)) revert NotOperator(address(this));

        require(_referralFee < 100 - fee, "Referral fee must be lower than platform fee");

        // Check duplicated listing: No need, this will update the item
        // if (listingPool[_collection][_tokenId].status) revert DuplicatedListing(_collection, _tokenId);

        //ILSP8(_collection).getOperatorsOf(_tokenId)
        listingPool[_collection][_tokenId] = ListingStruct(_token, _price, _referralFee, block.timestamp, true);

        // Add to user listing pool
        userListingPool[_msgSender()].push(UserListingStruct(_collection, _tokenId, _token, _price, _referralFee, block.timestamp, true));

        // user listing pool
        // userListingPool[_msgSender()].push(UserListingStruct(_collection, _tokenId, _token, _price, block.timestamp));
        //how about update/ re add
        emit NewTokenListed(_collection, _tokenId, _token, _price, _msgSender(), block.timestamp, true);
        return true;
    }

    ///@notice Update
    ///@dev Update market item
    function update(
        address _collection,
        bytes32 _tokenId,
        address _token,
        uint256 _price,
        uint8 _referralFee
    ) public whenNotPaused returns (bool) {
        ILSP8 COLLECTION = ILSP8(_collection);

        // Check owner of token
        if (COLLECTION.tokenOwnerOf(_tokenId) != _msgSender()) revert Unauthorized();

        // Make this contract an operator (authorizeOperator) so this contrct can transfer token to the buyer
        if (!COLLECTION.isOperatorFor(address(this), _tokenId)) revert NotOperator(address(this));

        require(_referralFee < 100 - fee, "Referral fee must be lower than platform fee");

        // Check duplicated listing: No need, this will update the item
        // if (listingPool[_collection][_tokenId].status) revert DuplicatedListing(_collection, _tokenId);

        //ILSP8(_collection).getOperatorsOf(_tokenId)
        listingPool[_collection][_tokenId] = ListingStruct(_token, _price, _referralFee, block.timestamp, true);

        // Update user listing pool
        //userListingPool[_msgSender()].push(UserListingStruct(_collection, _tokenId, _token, _price, _referralFee, block.timestamp, true));
        
        for (uint256 i = 0; i < userListingPool[_msgSender()].length; i++) {
            if (userListingPool[_msgSender()][i].collection == _collection && userListingPool[_msgSender()][i].tokenId == _tokenId) {
                userListingPool[_msgSender()][i] = UserListingStruct(_collection, _tokenId, _token, _price, _referralFee, block.timestamp, true);
            }
        }

        // user listing pool
        // userListingPool[_msgSender()].push(UserListingStruct(_collection, _tokenId, _token, _price, block.timestamp));
        //how about update/ re add
        emit TokenUpdated(_collection, _tokenId, _token, _price, _msgSender(), block.timestamp, true);
        return true;
    }

    /// @notice Cancel listing
    /// @dev Cancel means reset the all values, 0
    /// @param _collection Collection contract
    ///@param _tokenId Token Id in bytes32
    ///@return bool
    function cancelListing(address _collection, bytes32 _tokenId) public whenNotPaused returns (bool) {
        ILSP8 COLLECTION = ILSP8(_collection);

        // Check if sender is the owner of the token
        if (COLLECTION.tokenOwnerOf(_tokenId) != _msgSender()) revert Unauthorized();

        // Check if the token id is listed and the status is true
        require(listingPool[_collection][_tokenId].status, "The entered tokenId is not listed.");

        //ILSP8(_collection).getOperatorsOf(_tokenId)
        listingPool[_collection][_tokenId] = ListingStruct(address(0), 0, 0, block.timestamp, false);
        emit CancelListing(_collection, _tokenId, address(0), 0, _msgSender(), block.timestamp, false);

        // Remove from user listing pool
        for (uint256 i = 0; i < userListingPool[COLLECTION.tokenOwnerOf(_tokenId)].length - 1; i++) {
            if (userListingPool[COLLECTION.tokenOwnerOf(_tokenId)][i].collection == _collection && userListingPool[COLLECTION.tokenOwnerOf(_tokenId)][i].tokenId == _tokenId) {
                // userListingPool[_msgSender()][i] = UserListingStruct(address(0), bytes32(0), address(0), 0, block.timestamp, false)
                userListingPool[COLLECTION.tokenOwnerOf(_tokenId)][i] = userListingPool[COLLECTION.tokenOwnerOf(_tokenId)][i + 1];
            }
        }
        userListingPool[COLLECTION.tokenOwnerOf(_tokenId)].pop();

        return true;
    }

    /// @notice Calculate fees
    function calcFee(address _collection, bytes32 _tokenId) public view returns (uint256[3] memory) {
        ListingStruct memory item = listingPool[_collection][_tokenId];

        uint256 feeAmount = calcPercentage(item.price, fee);
        uint256 referralAmount = calcPercentage(item.price, item.referralFee);
        uint256 ownerAmount = calcPercentage(item.price, (100 - fee - item.referralFee));

        return [feeAmount, referralAmount, ownerAmount];
    }

    ///@notice buy
    function buy(
        address _collection,
        bytes32 _tokenId,
        address _referral,
        bool _force,
        bytes memory _data
    ) public payable whenNotPaused returns (bool) {
        ILSP8 COLLECTION = ILSP8(_collection);

        ListingStruct memory item = listingPool[_collection][_tokenId];

        // Check if the token id is listed and the status is true
        require(item.status, "The entered tokenId is not listed.buy.");

        // Owner of token can't buy
        require(COLLECTION.tokenOwnerOf(_tokenId) != _msgSender(), "Owner can't buy!");

        // Check if user hasn't revoke this contract as an operator for sell
        if (!COLLECTION.isOperatorFor(address(this), _tokenId)) revert NotOperator(address(this));

        // Check the token seller would like to recieve, is it LYX or LSP7?
        // Check if the price is not zero otherwise just trnasfer the token with no fee
        if (item.price > 0) {
            if (item.token == address(0)) {
                // Check the listed item price, it can be FREE too.
                if (msg.value != item.price) revert InsufficientBalance(msg.value);

                // Owner of the token
                uint256[3] memory fees = calcFee(_collection, _tokenId);

                if (fees[2] > 0) {
                    (bool ownerSuccess, ) = address(COLLECTION.tokenOwnerOf(_tokenId)).call{value: fees[2]}("");
                    require(ownerSuccess, "Failed to send Ether");
                }

                // Referral address
                if (fees[1] > 0) {
                    (bool referralSuccess, ) = address(_referral).call{value: fees[1]}("");
                    require(referralSuccess, "Failed to send Ether");
                }

                // Owner of this contract
                if (fees[0] > 0) {
                    (bool feeSuccess, ) = owner().call{value: fees[0]}("");
                    require(feeSuccess, "Failed to send Ether");
                }

                // Transfer the token
                // transferToken(_collection, _tokenId, _force, _data);
            } else {
                uint256 authorizedAmount = ILSP7(item.token).authorizedAmountFor(address(this), _msgSender());
                if (authorizedAmount < item.price) revert NotAuthorizedAmount(item.price, authorizedAmount);

                // Owner of the token
                uint256[3] memory fees = calcFee(_collection, _tokenId);

                if (fees[2] > 0) {
                    ILSP7(item.token).transfer(_msgSender(), address(COLLECTION.tokenOwnerOf(_tokenId)), fees[2], _force, _data);
                }

                // Referral address
                if (fees[1] > 0) {
                    ILSP7(item.token).transfer(_msgSender(), address(_referral), fees[1], _force, _data);
                }

                // Owner of this contract
                if (fees[0] > 0) {
                    ILSP7(item.token).transfer(_msgSender(), owner(), fees[0], _force, _data);
                }

                // Transfer the token
                // transferToken(_collection, _tokenId, _force, _data);
            }
        } //else {
        // Transfer for free with no fee 😠
        // transferToken(_collection, _tokenId, _force, _data);
        // }

        // Add it to tradePool to track trades
        _tradeCounter.increment();
        tradePool[bytes32(_tradeCounter.current())] = TradeStruct(_collection, _tokenId, item.token, item.price, address(COLLECTION.tokenOwnerOf(_tokenId)), _msgSender(), _referral, item.referralFee, block.timestamp);

        // Transfer
        transferToken(_collection, _tokenId, _force, _data);

        listingPool[_collection][_tokenId] = ListingStruct(address(0), 0, 0, block.timestamp, false);
        // ToDo: reset authorizedOperator: not sure the transfer function does that

        // Log
        emit SoldOut(_collection, _tokenId, item.token, item.price, address(COLLECTION.tokenOwnerOf(_tokenId)), _msgSender(), _referral, item.referralFee, block.timestamp);
        return true;
    }

    ///@notice Retrieve index of item
    // function _getIndexOfItem(address _collection, bytes32 _tokenId) internal view returns (uint256) {
    //     ILSP8 COLLECTION = ILSP8(_collection);
    //     for (uint256 i = 0; i < userListingPool[COLLECTION.tokenOwnerOf(_tokenId)].length - 1; i++) {
    //         if (userListingPool[COLLECTION.tokenOwnerOf(_tokenId)][i].collection == _collection && userListingPool[COLLECTION.tokenOwnerOf(_tokenId)][i].tokenId == _tokenId) return i;
    //     }
    // }

    ///@notice calcPercentage percentage
    ///@param _amount The total amount
    ///@param _bps The precentage
    ///@return percentage %
    function calcPercentage(uint256 _amount, uint256 _bps) public pure returns (uint256) {
        if (_bps == 0) return 0;
        require((_amount * _bps) >= 100);
        return (_amount * _bps) / 100;
    }

    ///@notice Withdraw LSP7 token
    function withdrawToken(
        address _token,
        address _to,
        uint256 _amount,
        bool _force,
        bytes memory _data
    ) public onlyOwner {
        ILSP7(_token).transfer(address(this), _to, _amount, _force, _data);
    }

    ///@notice Withdraw the balance from this contract to the owner's address
    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Failed to send Ether");
    }

    ///@notice Transfer balance from this contract to input address
    function transferBalance(address payable _to, uint256 _amount) public onlyOwner {
        // Note that "to" is declared as payable
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Failed to send Ether");
    }

    /// @notice Return the balance of this contract
    function getBalance() public view onlyOwner returns (uint256) {
        return address(this).balance;
    }

    /// @notice Pause mint
    function pause() public onlyOwner {
        _pause();
    }

    /// @notice Unpause mint
    function unpause() public onlyOwner {
        _unpause();
    }
}
