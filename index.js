const StellarSdk = require('stellar-sdk');
var StellarBase = require('stellar-base');
const config = require('./config.json');

const server = new StellarSdk.Server('https://horizon-testnet.stellar.org/')

const fail = (message) => {
    console.log('\n')
    console.error(message)
    if (message.response && message.response.data && message.response.data.extras && message.response.data.extras.result_codes && message.response.data.extras.result_codes.operations) {
        const reason = message.response.data.extras.result_codes.operations;
        switch(reason) {
            case 'op_underfunded':
                console.log('reason:', 'Sender account has insufficient funds');
                break;
            default:
                console.log('reason:', reason)
        }
    }
    process.exit(1)
}

const success = (tn) => {
    if (tn.successful){
        console.log(`\nTransaction succeeded!`)
    }else{
        console.log('\nTransaction Failed')
    }
}

//building transaction function
const sendTransaction = async (keypair, distributor, destAccountAddress) => {

    const paymentToDest = {
        destination: destAccountAddress,
        asset: new StellarSdk.Asset('NULL', 'GCIL22USJAHZMLPUJ2GMBBSQGVH5PWKVUGMVUWCRKRA6Z44DA26HKUK6'),
        amount: '100',
    }
    const txOptions = {
        fee: await server.fetchBaseFee(),
        networkPassphrase: 'Test SDF Network ; September 2015',
    }
    const dist = await server.loadAccount(distributor)
    const transaction = new StellarSdk.TransactionBuilder(dist, txOptions)
        .addOperation(StellarSdk.Operation.payment(paymentToDest))
        .setTimeout(StellarBase.TimeoutInfinite)
        .build()

    transaction.sign(keypair)

    const response = await server.submitTransaction(transaction)
    return response

}

function streamOperations() {

    const issuer = 'GCIL22USJAHZMLPUJ2GMBBSQGVH5PWKVUGMVUWCRKRA6Z44DA26HKUK6';
    const assetName = 'NULL';

    var distAcct = 'GDBW5DHUHJMAHIZRCOUDGL2AXTCQWQJONXLQICJWJOZOXO6VOOY2P6QM';
    var distKey = config.private_key;
    const keypair = StellarSdk.Keypair.fromSecret(distKey);

    const es = server.operations()
    .cursor('now')
    .stream({
        onmessage: function (message) {
            if ((message.asset_code == 'NULL') & (message.type == 'change_trust') & (message.asset_issuer == issuer)) {
                console.log(message);
                
                sendTransaction(keypair, distAcct, message.source_account).then(success).catch(fail)
            }
        }
    })
}

streamOperations();