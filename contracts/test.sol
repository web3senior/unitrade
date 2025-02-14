// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract test {
    uint256[] public list = [1, 2, 3, 4, 5];

    function get() public view returns (uint256[] memory) {
        return list;
    }

        function getLen() public view returns (uint) {
        return list.length;
    }

function removeElementByIndex(uint _index) public returns (bool) {
     if (_index >= list.length) {
         return false;
     }

     for (uint i = _index; i < list.length - 1; i++) {
         list[i] = list[i + 1];
     }
     list.pop();

     return true;
}
}
