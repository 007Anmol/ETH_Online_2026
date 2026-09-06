// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

abstract contract Ownable {
    address private _owner;

    error OwnableUnauthorizedAccount(address account);
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    modifier onlyOwner() {
        if (msg.sender != _owner) {
            revert OwnableUnauthorizedAccount(msg.sender);
        }
        _;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }

        _owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }

        address previousOwner = _owner;
        _owner = newOwner;

        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function renounceOwnership() external onlyOwner {
        address previousOwner = _owner;
        _owner = address(0);

        emit OwnershipTransferred(previousOwner, address(0));
    }
}