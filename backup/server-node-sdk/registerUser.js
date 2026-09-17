const { Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

async function main() {
    try {
        const ccpPath = path.resolve(__dirname, '..', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
        const ca = new FabricCAServices(caURL);

        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check user
        const userIdentity = await wallet.get('bobby');
        if (userIdentity) {
            console.log('An identity for the user "bobby" already exists in the wallet');
            return;
        }

        // Admin check
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.log('An identity for the admin user "admin" does not exist in the wallet. Run enrollAdmin.js first.');
            return;
        }

        // Admin context create karein
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Naye user ko register aur enroll karein
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: 'bobby',
            role: 'client'
        }, adminUser);

        const enrollment = await ca.enroll({
            enrollmentID: 'bobby',
            enrollmentSecret: secret
        });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put('bobby', x509Identity);
        console.log('Successfully registered and enrolled user "bobby" and imported it into the wallet');

    } catch (error) {
        console.error(`Failed to register user "bobby": ${error}`);
        process.exit(1);
    }
}

main();