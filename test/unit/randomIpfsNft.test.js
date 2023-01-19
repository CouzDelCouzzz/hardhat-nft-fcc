const { assert, expect } = require("chai")
const { network, ethers, deployments } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Random IPFS Nft Test", function () {
          // General variables
          let mintFee
          const chainId = network.config.chainId

          beforeEach(async function () {
              // Getting accounts and the deployer
              accounts = await ethers.getSigners()
              deployer = accounts[0]

              // Deploying what's needed
              await deployments.fixture(["mocks", "randomipfs"])

              // Getting the contract we want to test and the Mocks
              randomIPFSNft = await ethers.getContract("RandomIpfsNft", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)

              // Getting values
              mintFee = await randomIPFSNft.getMintFee()
          })

          describe("Constructor", function () {
              it("initializes the contract correctly", async function () {
                  const dogTokenUriZero = await randomIPFSNft.getDogTokenUris(0)
                  assert(dogTokenUriZero.includes("ipfs://"))

                  assert.equal(mintFee.toString(), networkConfig[chainId]["mintFee"])

                  const nftName = await randomIPFSNft.name()
                  assert.equal(nftName.toString(), "Random IPSF NFT")

                  const nftsymbol = await randomIPFSNft.symbol()
                  assert.equal(nftsymbol.toString(), "RIN")

                  // We can also test all the varible used for the Mock...
              })
          })

          describe("RequestNft", function () {
              it("reverts when you don't pay the mint fees", async function () {
                  await expect(randomIPFSNft.requestNft()).to.be.revertedWith(
                      "RandomIpfsNft__NeedMoreETHSent"
                  )
              })
              it("reverts when you pay less than the mint fee", async function () {
                  await expect(
                      randomIPFSNft.requestNft({
                          value: mintFee.sub(ethers.utils.parseEther("0.00001")),
                      })
                  ).to.be.revertedWith("RandomIpfsNft__NeedMoreETHSent")
              })
              it("emits an Event when the NFT is requested with mint fees", async function () {
                  await expect(randomIPFSNft.requestNft({ value: mintFee })).to.emit(
                      randomIPFSNft,
                      "NftRequested"
                  )
              })
          })

          describe("FullfillRandomWords", function () {
              it("mint when random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      randomIPFSNft.once("NftMinted", async () => {
                          try {
                              const tokenUri = await randomIPFSNft.getDogTokenUris(0)
                              const tokenCounter = await randomIPFSNft.getTokenCounter()
                              assert.equal(tokenUri.toString().includes("ipfs://"), true)
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })
                      try {
                          const requestNftResponse = await randomIPFSNft.requestNft({
                              value: mintFee,
                          })
                          const txRequestNft = await requestNftResponse.wait(1)
                          const requestId = txRequestNft.events[1].args.requestId

                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestId,
                              randomIPFSNft.address
                          )
                      } catch (error) {
                          console.log(error)
                          reject(error)
                      }
                  })
              })
          })

          describe("getBreedFromModdedRng", () => {
              it("should return pug if moddedRng < 10", async function () {
                  const expectedValue = await randomIPFSNft.getBreedFromModdedRng(7)
                  assert.equal(0, expectedValue)
              })
              it("should return shiba-inu if moddedRng is between 10 - 39", async function () {
                  const expectedValue = await randomIPFSNft.getBreedFromModdedRng(21)
                  assert.equal(1, expectedValue)
              })
              it("should return st. bernard if moddedRng is between 40 - 99", async function () {
                  const expectedValue = await randomIPFSNft.getBreedFromModdedRng(77)
                  assert.equal(2, expectedValue)
              })
              it("should revert if moddedRng > 99", async function () {
                  await expect(randomIPFSNft.getBreedFromModdedRng(100)).to.be.revertedWith(
                      "RandomIpfsNft__RangeOutOfBounds"
                  )
              })
          })
      })
