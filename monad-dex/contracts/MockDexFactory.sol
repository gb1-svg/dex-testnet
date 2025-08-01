// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./MockDexPair.sol";

contract MockDexFactory {
    mapping(address => mapping(address => address)) public getPair;
    address public immutable WMON;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);

    constructor(address _WMON) {
        WMON = _WMON;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "PAIR_EXISTS");

        pair = address(new MockDexPair());
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;

        emit PairCreated(token0, token1, pair, 1);
    }
}