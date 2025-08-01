// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Token.sol";
import "./MockDexRouter.sol";

contract BondingCurve is Ownable {
    IERC20 public immutable token;
    uint256 public constant SLOPE = 1000;
    uint256 public reserveSupply;

    uint256 public totalMonCollected;
    uint256 public constant liquidityThreshold = 65 ether;
    bool public isLiquidityAdded = false;

    MockDexRouter public immutable dexRouter;
    address public immutable WMON_ADDRESS;

    event TokensBought(address indexed buyer, uint256 tokenAmount, uint256 monSpent);
    event LiquidityAdded(uint256 monAmount, uint256 tokenAmount);

    constructor(address _tokenAddress, address _dexRouterAddress, address _WMONAddress) Ownable(msg.sender) {
        token = IERC20(_tokenAddress);
        dexRouter = MockDexRouter(_dexRouterAddress);
        WMON_ADDRESS = _WMONAddress;
    }

    function getBuyPrice(uint256 _amount) public view returns (uint256) {
        uint256 startSupply = reserveSupply;
        uint256 endSupply = startSupply + _amount;
        uint256 price = (SLOPE * (endSupply * endSupply - startSupply * startSupply)) / 2;
        return price;
    }

    function buy(uint256 _amount) external payable {
        require(!isLiquidityAdded, "Liquidity has been added to DEX.");
        
        uint256 requiredMon = getBuyPrice(_amount);
        require(msg.value >= requiredMon, "Insufficient MON sent");
        
        uint256 change = msg.value - requiredMon;
        
        if (change > 0) {
            (bool success, ) = msg.sender.call{value: change}("");
            require(success, "Failed to send back change");
        }
        
        reserveSupply += _amount;
        totalMonCollected += requiredMon;
        Token(address(token)).mint(msg.sender, _amount);

        emit TokensBought(msg.sender, _amount, requiredMon);
    }
    
    function addLiquidityAndGraduate() external onlyOwner {
        require(!isLiquidityAdded, "Liquidity has already been added.");
        require(totalMonCollected >= liquidityThreshold, "Not enough MON collected.");

        isLiquidityAdded = true;

        uint256 monToTransfer = totalMonCollected;
        uint256 tokensToTransfer = reserveSupply;
        
        Token(address(token)).approve(address(dexRouter), tokensToTransfer);

        dexRouter.addLiquidityWMON{value: monToTransfer}(
            address(token),
            tokensToTransfer,
            0,
            0,
            owner(),
            block.timestamp
        );

        emit LiquidityAdded(monToTransfer, tokensToTransfer);
    }
}