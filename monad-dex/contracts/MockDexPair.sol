// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockDexPair is ERC20("LP Token", "LP") {
    address public token0;
    address public token1;

    uint256 public reserve0;
    uint256 public reserve1;

    function mint(address to, uint256 liquidity) external returns (uint256) {
        _mint(to, liquidity);
        return liquidity;
    }

    // Fungsi baru untuk mengatur cadangan (reserves).
    function setReserves(uint256 _reserve0, uint256 _reserve1) external {
        reserve0 = _reserve0;
        reserve1 = _reserve1;
    }
}