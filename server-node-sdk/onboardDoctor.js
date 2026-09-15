'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {

    try {

        const ccpPath = path.resolve(
            __dirname,
            '..','fabric-samples',
            'test-network',
            'organizations',
            'peerOrganizations',
            'org1.example.com',
            'connection-org1.json'
        );

        const ccp = JSON.parse(
            fs.readFileSync(ccpPath, 'utf8')
        );

        const caInfo =
            ccp.certificateAuthorities[
                'ca.org1.example.com'
            ];

        const caTLSCACerts =
            caInfo.tlsCACerts.pem;

        const ca = new FabricCAServices(
            caInfo.url,
            {
                trustedRoots: caTLSCACerts,
                verify: false
            },
            caInfo.caName
        );

        const walletPath = path.join(
            __dirname,
            'wallet'
        );

        const wallet = await Wallets.newFileSystemWallet(
            walletPath
        );

        const identity = await wallet.get('admin');

        if (!identity) {
            console.log(
                'Admin identity not found in wallet.'
            );
            console.log(
                'Please run enrollAdmin.js first.'
            );
            return;
        }

        const doctorIdentity =
            await wallet.get('doctor');

        if (doctorIdentity) {
            console.log(
                'Doctor identity already exists in wallet.'
            );
            return;
        }

        const provider =
            wallet.getProviderRegistry()
                .getProvider(identity.type);

        const adminUser =
            await provider.getUserContext(
                identity,
                'admin'
            );

        const secret =
            await ca.register(
                {
                    affiliation: 'org1.department1',
                    enrollmentID: 'doctor',
                    role: 'client'
                },
                adminUser
            );

        const enrollment =
            await ca.enroll({
                enrollmentID: 'doctor',
                enrollmentSecret: secret
            });

        const x509Identity = {
            credentials: {
                certificate:
                    enrollment.certificate,
                privateKey:
                    enrollment.key.toBytes()
            },
            mspId: 'Org1MSP',
            type: 'X.509',
            version: 1
        };

        await wallet.put(
            'doctor',
            x509Identity
        );

        console.log(
            'Doctor successfully onboarded.'
        );

    } catch (error) {

        console.error(
            `Failed to onboard doctor: ${error}`
        );

        process.exit(1);
    }
}

main();