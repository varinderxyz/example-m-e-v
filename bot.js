import { Wallet, BigNumber, ethers, providers } from 'ethers'
const { FlashbotsBundleProvider, FlashbotsBundleResolution } = require('@flashbots/ethers-provider-bundle')

// 2. goerli testnet
const provider = new providers.JsonRpcProvider(
    'https://eth-goerli.g.alchemy.com/v2/wOB3tqbHfs_RGAeFJqomylXrUOH_MrVT'
)
const wsProvider = new providers.WebSocketProvider(
    'wss://eth-goerli.g.alchemy.com/v2/wOB3tqbHfs_RGAeFJqomylXrUOH_MrVT'
)

const authSigner = new Wallet(
    '',
    provider
)


const start = async () => {
    const flashbotsProvider = await FlashbotsBundleProvider.create(
        provider,
        authSigner,
        'https://relay-goerli.flashbots.net',
    )

    const GWEI = BigNumber.from(10).pow(9)
    const LEGACY_GAS_PRICE = GWEI.mul(13)
    const PRIORITY_FEE = GWEI.mul(100)
    const blockNumber = await provider.getBlockNumber()
    const block = await provider.getBlock(blockNumber)
    const maxBaseFeeInFutureBlock =
        FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(block.baseFeePerGas, 6) 

    //console.log('maxBaseFeeInFutureBlock', String(maxBaseFeeInFutureBlock), String(maxBaseFeeInFutureBlock.div('100000000000000000')))

    const amountInEther = '0.001'
    const signedTransactions = await flashbotsProvider.signBundle([
        { 
            signer: authSigner,
            transaction: {
                to: '',
                type: 2,
                maxFeePerGas: PRIORITY_FEE.add(maxBaseFeeInFutureBlock),
                maxPriorityFeePerGas: PRIORITY_FEE,
                data: '0x',
                chainId: 5,
                value: ethers.utils.parseEther(amountInEther),
                // gasLimit: 300000,
            },
        },
        {
            signer: authSigner,
            transaction: {
                to: '',
                gasPrice: LEGACY_GAS_PRICE,
                data: '0x',
                value: ethers.utils.parseEther(amountInEther),
                // gasLimit: 300000,
            },
        },
    ])

    //console.log(new Date())
    //console.log('run the simulation...')
    const simulation = await flashbotsProvider.simulate(
        signedTransactions,
        blockNumber + 1,
    )
    //console.log(new Date())

    if (simulation.firstRevert) {
        //console.log(`Simulation Error: ${simulation.firstRevert.error}`)
    } else {
        console.log(
            `Simulation Success: ${blockNumber}}`
        )
    }

    for (var i = 1; i <= 10; i++) {
        const bundleSubmission = await flashbotsProvider.sendRawBundle(
            signedTransactions,
            blockNumber + i
        )
        //console.log('bundle submitted, waiting', bundleSubmission.bundleHash)

        const waitResponse = await bundleSubmission.wait()
        //console.log(`Wait Response: ${FlashbotsBundleResolution[waitResponse]}`)
        if (
            waitResponse === FlashbotsBundleResolution.BundleIncluded ||
            waitResponse === FlashbotsBundleResolution.AccountNonceTooHigh
        ) {
            console.log('Bundle included!')
            process.exit(0)
        } else {
            console.log({
                bundleStats: await flashbotsProvider.getBundleStats(
                    simulation.bundleHash,
                    blockNumber + 1,
                ),
                userStats: await flashbotsProvider.getUserStats(),
            })
        }
    }
    console.log('bundles submitted')
}

start()