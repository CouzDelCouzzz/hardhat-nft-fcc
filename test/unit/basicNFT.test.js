const { assert, expect } = require("chai")
const { network, ethers, getNamedAccounts, deployments } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("BasicNFT Unit Tests", function () {
          let tokenCounter
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"]) // Will call the deployments scripts with the corresponding tag "all"

              // Getting the contract
              basicNFT = await ethers.getContract("BasicNFT", deployer)
          })

          describe("constructor", function () {
              it("should initialize the token counter", async function () {
                  tokenCounter = await basicNFT.getTokenCounter()
                  assert.equal(tokenCounter.toString(), "0")
                  // TODO should also check the name and symbol !!
              })
          })

          describe("mintNFT", function () {
              it("should emit a Transfer Event", async function () {
                  await expect(basicNFT.mintNFT()).to.emit(basicNFT, "Transfer")
              })
              it("should increase the tokenId by one after a mint", async function () {
                  const tokenIdBefore = await basicNFT.getTokenCounter()
                  const tx = await basicNFT.mintNFT()
                  await tx.wait(1)
                  const tokenIdAfter = await basicNFT.getTokenCounter()
                  assert.equal(tokenIdAfter.toNumber(), tokenIdBefore.add(1).toNumber())
              })
              // TODO should check the balance of the deployer after the mint to check that he has 1 nft
          })
      })
