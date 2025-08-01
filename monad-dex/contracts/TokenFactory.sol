// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "./Token.sol";
import "./BondingCurve.sol";
import "./MockDexFactory.sol";
import "./MockDexRouter.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenFactory is Ownable {
    address public feeCollector;
    uint256 public launchFee = 0.01 ether;

    address public dexRouterAddress;
    address public dexFactoryAddress;
    address public wmonAddress;

    struct TokenInfo {
        address tokenAddress;
        address bondingCurveAddress;
        address creator;
        string name;
        string symbol;
    }

    mapping(address => TokenInfo) public tokenInfos;
    mapping(address => bool) public isTokenLaunched;

    event TokenLaunched(
        address indexed creator,
        address indexed tokenAddress,
        address indexed bondingCurveAddress,
        string name,
        string symbol
    );

    constructor(address _dexFactoryAddress, address _dexRouterAddress, address _wmonAddress) Ownable(msg.sender) {
        feeCollector = msg.sender;
        dexFactoryAddress = _dexFactoryAddress;
        dexRouterAddress = _dexRouterAddress;
        wmonAddress = _wmonAddress;
    }

    function setLaunchFee(uint256 newFee) external onlyOwner {
        launchFee = newFee;
    }
    
    function withdrawFees(address to) external onlyOwner {
        (bool success, ) = to.call{value: address(this).balance}("");
        require(success, "Failed to withdraw fees");
    }

    function launchNewToken(string memory _name, string memory _symbol) external payable {
        require(msg.value == launchFee, "Incorrect launch fee");

        Token token = new Token(_name, _symbol, msg.sender);
        
        BondingCurve bondingCurve = new BondingCurve(address(token), dexRouterAddress, wmonAddress);
        
        token.grantMinterRole(address(bondingCurve));
        
        (bool success, ) = feeCollector.call{value: msg.value}("");
        require(success, "Failed to transfer fee to collector");

        address tokenAddress = address(token);
        address bondingCurveAddress = address(bondingCurve);

        tokenInfos[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            bondingCurveAddress: bondingCurveAddress,
            creator: msg.sender,
            name: _name,
            symbol: _symbol
        });
        isTokenLaunched[tokenAddress] = true;

        emit TokenLaunched(msg.sender, tokenAddress, bondingCurveAddress, _name, _symbol);
    }
}