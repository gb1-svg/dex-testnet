// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MockDexFactory.sol";
import "./MockDexPair.sol";

contract MockDexRouter {
    address public factory;
    address public WMON;

    constructor(address _factory, address _WMON) {
        factory = _factory;
        WMON = _WMON;
    }

    function addLiquidityWMON(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountWMONMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        require(msg.value >= amountWMONMin, "INSUFFICIENT_WMON_AMOUNT");
        
        address pair = MockDexFactory(factory).getPair(token, WMON);
        if (pair == address(0)) {
            pair = MockDexFactory(factory).createPair(token, WMON);
        }

        require(IERC20(token).transferFrom(msg.sender, pair, amountTokenDesired), "TOKEN_TRANSFER_FAILED");

        // Panggil fungsi `setReserves` yang baru untuk memperbarui nilai.
        MockDexPair(pair).setReserves(amountTokenDesired, msg.value);

        uint256 liquidityAmount = amountTokenDesired + msg.value;
        MockDexPair(pair).mint(to, liquidityAmount);

        return (amountTokenDesired, msg.value, liquidityAmount);
    }
}