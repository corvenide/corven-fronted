// src/features/connect/docs/pages.tsx
//
// The Corven Connect docs, one entry per page. Keep these in step with
// packages/connect*, apps/connect-service and docs/CORVEN CONNECT.md.

import type { ReactNode } from 'react';

import { B, C, Callout, CodeBlock, DocLink, H2, H3, OL, P, Steps, Table, UL } from './primitives';

export interface DocPage {
    slug: string;
    title: string;
    group: 'Getting started' | 'Guides' | 'Reference';
    summary: string;
    /** Section headings, for "On this page". Must match the H2s. */
    sections: string[];
    body: ReactNode;
}

const API = 'https://staging-api.corvanide.space/connect/v1';

const QUICKSTART_APP = `import { CorvenConnectProvider, ConnectButton, useCorvenConnect } from '@corven/connect-react';
import { ccc } from '@ckb-ccc/core';

export default function App() {
  return (
    <CorvenConnectProvider appId="app_…" theme="dark">
      <ConnectButton />
      <Pay />
    </CorvenConnectProvider>
  );
}

function Pay() {
  const { authenticated, getSigner } = useCorvenConnect();
  if (!authenticated) return null;

  const pay = async () => {
    const signer = getSigner('TESTNET');              // a normal CCC signer
    const { script } = await ccc.Address.fromString('ckt1…', signer.client);
    const tx = ccc.Transaction.from({
      outputs: [{ lock: script, capacity: ccc.fixedPointFrom(100) }],
    });
    await tx.completeInputsByCapacity(signer);
    await tx.completeFeeBy(signer);
    const hash = await signer.sendTransaction(tx);    // shows the approval screen
    console.log('sent', hash);
  };

  return <button onClick={pay}>Pay 100 CKB</button>;
}`;

export const DOCS: DocPage[] = [
    {
        slug: 'introduction',
        title: 'Introduction',
        group: 'Getting started',
        summary: 'Sign-in and a CKB wallet for your users, without seed phrases.',
        sections: ['What you get', 'How it works', 'Next steps'],
        body: (
            <>
                <P>
                    Corven Connect lets people sign in to your CKB app with a phone number, email, Google, a passkey or
                    a wallet they already have. Everyone who signs up with phone, email, Google or a passkey gets an
                    embedded CKB wallet on testnet and mainnet. There’s no extension to install and no seed phrase to
                    write down.
                </P>

                <H2>What you get</H2>
                <UL>
                    <li><B>A drop-in modal</B> for React: sign-in, the wallet (balance, send, receive, export) and an approval screen for every transaction.</li>
                    <li><B>A CCC signer</B> for the signed-in user, so the rest of your code is ordinary <DocLink to="https://github.com/ckb-devrel/ccc">CCC</DocLink>.</li>
                    <li><B>Five sign-in methods</B> you switch on per app: phone (SMS, WhatsApp, voice call), email, Google, passkeys and existing wallets (JoyID, MetaMask, UniSat, OKX and more).</li>
                    <li><B>A dashboard</B> to create apps, see users and usage, and invite your team.</li>
                </UL>

                <H2>How it works</H2>
                <OL>
                    <li>You create an app in the <DocLink to="/connect">Connect dashboard</DocLink> and get an app id (<C>app_…</C>).</li>
                    <li>You add the domains your app runs on. Requests from any other site are refused.</li>
                    <li>Your frontend wraps itself in <C>{'<CorvenConnectProvider appId="app_…">'}</C>. People sign in through the modal.</li>
                    <li>When your code signs a transaction, the user sees what leaves their wallet and approves it. Corven signs it on the server, after looking up every input on chain.</li>
                </OL>
                <P>
                    Users are per app: someone who signs in to two Connect apps has two separate accounts and two
                    separate wallets.
                </P>

                <H2>Next steps</H2>
                <UL>
                    <li><DocLink to="/connect/docs/quickstart">Quick start</DocLink>: a working sign-in in about five minutes.</li>
                    <li><DocLink to="/connect/docs/sign-in-methods">Sign-in methods</DocLink>: what each one needs.</li>
                    <li><DocLink to="/connect/docs/wallets">Wallets and signing</DocLink>: transactions, mainnet and limits.</li>
                </UL>
            </>
        ),
    },

    {
        slug: 'quickstart',
        title: 'Quick start',
        group: 'Getting started',
        summary: 'Create an app, install the SDK, add the provider and a button.',
        sections: ['Create an app', 'Install', 'Add the provider', 'Run it'],
        body: (
            <>
                <H2>Create an app</H2>
                <Steps
                    steps={[
                        {
                            title: 'Open the dashboard',
                            body: (
                                <>
                                    Go to <DocLink to="/connect">Connect → Apps</DocLink> and sign in with your Corven account (wallet,
                                    Google or email).
                                </>
                            ),
                        },
                        {
                            title: 'Create the app',
                            body: (
                                <>
                                    Click <B>New app</B>, give it a name and add the origins it runs on, for example{' '}
                                    <C>https://myapp.xyz</C> and <C>http://localhost:5173</C>. Pick the sign-in methods you want.
                                </>
                            ),
                        },
                        {
                            title: 'Copy the app id',
                            body: (
                                <>
                                    It looks like <C>app_6tkNAdlMeZPpCwwx</C>. It isn’t a secret: it goes in your frontend code.
                                </>
                            ),
                        },
                    ]}
                />

                <H2>Install</H2>
                <CodeBlock lang="bash" code={`npm install @corven/connect-react @ckb-ccc/core
# optional: "Connect a wallet" (JoyID, MetaMask, UniSat, OKX…)
npm install @ckb-ccc/ccc`} />
                <P>
                    <C>@corven/connect-react</C> includes the framework-free client, <C>@corven/connect</C>. Use that one
                    on its own if you don’t use React (see <DocLink to="/connect/docs/core-sdk">Core SDK</DocLink>).
                </P>

                <H2>Add the provider</H2>
                <P>
                    Wrap your app once. <C>ConnectButton</C> shows “Sign in” when signed out and the wallet address when
                    signed in. <C>getSigner()</C> gives you a CCC signer for the user’s wallet.
                </P>
                <CodeBlock lang="tsx" title="App.tsx" code={QUICKSTART_APP} />

                <H2>Run it</H2>
                <P>
                    Start your dev server on one of the origins you added, click <B>Sign in</B>, and sign up with your phone
                    or email. New users get their wallet straight away. Fund the testnet address from the{' '}
                    <DocLink to="https://faucet.nervos.org">Nervos faucet</DocLink> and try the payment.
                </P>
                <Callout>
                    Getting <C>unknown_app</C>? The app id is wrong. Getting <C>origin_not_allowed</C> or a CORS error? Add
                    the exact origin (scheme, host and port) under <B>Settings → Allowed origins</B>.
                </Callout>
            </>
        ),
    },

    {
        slug: 'sign-in-methods',
        title: 'Sign-in methods',
        group: 'Guides',
        summary: 'Phone, email, Google, passkeys and existing wallets.',
        sections: ['Choosing methods', 'Phone', 'Email', 'Google', 'Passkeys', 'Existing wallets', 'Linking more methods'],
        body: (
            <>
                <H2>Choosing methods</H2>
                <P>
                    Turn methods on and off in the dashboard under <B>Settings → Sign-in methods</B>. The modal shows only
                    the ones you turned on, and the API refuses the others. Changes apply on the next page load, with no
                    redeploy.
                </P>
                <Table
                    head={['Method', 'Embedded wallet', 'You need']}
                    rows={[
                        ['Phone', 'Yes', 'Nothing. Codes go by SMS, WhatsApp or voice call.'],
                        ['Email', 'Yes', 'Nothing. Codes are emailed.'],
                        ['Google', 'Yes', 'Your own Google OAuth client id.'],
                        ['Passkey', 'Yes', 'Nothing. Passkeys belong to your domain.'],
                        ['Wallet', 'No, they use their own', <><C>@ckb-ccc/ccc</C> installed in your app.</>],
                    ]}
                />

                <H2>Phone</H2>
                <P>
                    People type their number (local numbers like <C>0712 345 678</C> work too) and get a 6-digit code.
                    They can choose SMS, WhatsApp or a voice call. Codes expire after a few minutes, and repeated wrong
                    codes or too many sends are rate-limited per number and per IP address.
                </P>

                <H2>Email</H2>
                <P>Same flow as phone: a 6-digit code sent to the address.</P>

                <H2>Google</H2>
                <OL>
                    <li>In Google Cloud Console, create an OAuth client of type <B>Web application</B>.</li>
                    <li>Under <B>Authorized JavaScript origins</B>, add every origin your app runs on.</li>
                    <li>Paste the client id (<C>…apps.googleusercontent.com</C>) into <B>Settings → Google client id</B>.</li>
                </OL>
                <Callout>Google sign-in only works on the origins listed in your OAuth client, so keep both lists in step.</Callout>

                <H2>Passkeys</H2>
                <P>
                    Passkeys use the device’s Face ID, fingerprint or PIN. A passkey belongs to the domain it was made on,
                    so one made on <C>localhost</C> won’t work on your production domain. Signed-in users can add one from
                    the wallet’s <B>Sign-in methods</B> tab.
                </P>

                <H2>Existing wallets</H2>
                <P>
                    With <B>Wallet</B> on, people can sign in with a wallet they already have, through CCC: JoyID,
                    MetaMask and other EVM wallets, UniSat, OKX, Xverse, UTXO Global, Rei and Nostr. The wallet signs a
                    one-time message. That’s no transaction and no fee.
                </P>
                <UL>
                    <li>Their CKB testnet address becomes their identity.</li>
                    <li>They get <B>no embedded wallet</B>, and Corven holds no keys for them. <C>user.embeddedWallets</C> is <C>false</C>.</li>
                    <li><C>getSigner('TESTNET')</C> returns their wallet’s own signer, and their wallet shows its own prompt.</li>
                    <li>After a reload the SDK reconnects the wallet quietly when it can; otherwise the wallet screen offers <B>Reconnect</B>.</li>
                </UL>

                <H2>Linking more methods</H2>
                <P>
                    Signed-in users can add more ways to sign in from the wallet (<C>openWallet()</C>, then the{' '}
                    <B>Sign-in methods</B> tab). A phone, email or Google account belongs to one user per app: linking one
                    that’s already used by someone else is refused, and nothing is merged silently. Users always keep at
                    least one method.
                </P>
            </>
        ),
    },

    {
        slug: 'wallets',
        title: 'Wallets and signing',
        group: 'Guides',
        summary: 'Embedded wallets, the approval screen, mainnet and limits.',
        sections: ['Embedded wallets', 'Signing transactions', 'Mainnet', 'Exporting a key', 'Custom networks'],
        body: (
            <>
                <H2>Embedded wallets</H2>
                <P>
                    Each user gets one testnet and one mainnet address. Private keys are encrypted (AES-256-GCM) and
                    bound to the user, network and address. Read balances and recent activity with{' '}
                    <C>client.getWallets()</C>, or open the built-in wallet with <C>openWallet()</C>.
                </P>

                <H2>Signing transactions</H2>
                <P>
                    <C>getSigner(network)</C> returns a CCC signer. Build transactions as you normally would with CCC. When
                    you call <C>signer.signTransaction()</C> or <C>signer.sendTransaction()</C>:
                </P>
                <OL>
                    <li>The modal shows what leaves the wallet, who receives it and the fee.</li>
                    <li>If the user approves, Corven looks up every input on chain (anything the transaction claims about its inputs is ignored), checks it spends the user’s own cells, and signs it.</li>
                    <li>If they reject, the call throws <C>UserRejectedError</C>.</li>
                </OL>
                <CodeBlock lang="ts" code={`import { UserRejectedError } from '@corven/connect-react';

try {
  await signer.sendTransaction(tx);
} catch (e) {
  if (e instanceof UserRejectedError) return; // they said no
  throw e;
}`} />

                <H2>Mainnet</H2>
                <UL>
                    <li>Mainnet signing is off until an owner turns on <B>Settings → Mainnet</B> for the app.</li>
                    <li>Every mainnet signature needs a fresh confirmation (a code, a passkey, Google, or their linked wallet). It’s single use and valid for 5 minutes. The modal handles it.</li>
                    <li>Each user can send at most a daily amount of CKB on mainnet (set by the server, 1,000 CKB by default).</li>
                </UL>
                <Callout tone="warn">
                    Holding keys for users, especially on mainnet, may carry legal obligations where you operate. Start on
                    testnet.
                </Callout>

                <H2>Exporting a key</H2>
                <P>
                    Users can export their private key from the wallet screen at any time, after a confirmation step.
                    Their wallet is theirs.
                </P>

                <H2>Custom networks</H2>
                <P>Pass your own CCC clients, for example for a devnet or your own RPC:</P>
                <CodeBlock lang="tsx" code={`<CorvenConnectProvider
  appId="app_…"
  clients={{ TESTNET: new ccc.ClientPublicTestnet({ url: 'https://my-rpc.example/' }) }}
>`} />
            </>
        ),
    },

    {
        slug: 'dashboard',
        title: 'Managing apps',
        group: 'Guides',
        summary: 'Apps, usage, users, settings and your team.',
        sections: ['Apps', 'Overview', 'Users', 'Settings', 'Team and roles'],
        body: (
            <>
                <P>
                    The <DocLink to="/connect">Connect dashboard</DocLink> is where you manage apps. Sign in with your Corven
                    account. Guest sessions from the IDE can’t own apps, so connect a wallet first.
                </P>

                <H2>Apps</H2>
                <P>Create up to 10 apps. Each gets an id for the SDK. Whoever creates an app is its owner.</P>

                <H2>Overview</H2>
                <P>
                    Total, new and active users, sign-ins, codes sent and signed transactions for the last 7, 30 or 90
                    days. Also a daily chart, which methods people use, and setup code with your app id filled in.
                </P>

                <H2>Users</H2>
                <P>
                    Search by phone, email or address. Open a user to see their sign-in methods, wallets, sessions and
                    signed transactions. You can sign them out everywhere or delete them. Deleting removes their account
                    and wallet keys for good, so they should export their keys first.
                </P>

                <H2>Settings</H2>
                <P>
                    Name, logo, allowed origins (up to 20), sign-in methods and Google client id. Only owners can turn
                    on mainnet or delete the app.
                </P>

                <H2>Team and roles</H2>
                <Table
                    head={['Role', 'Can']}
                    rows={[
                        ['Owner', 'Everything, including mainnet, roles and deleting the app.'],
                        ['Admin', 'Settings, users, and inviting admins or viewers.'],
                        ['Viewer', 'See usage, users and settings. No changes.'],
                    ]}
                />
                <P>
                    Invite people with a link. It works once and lasts 7 days, and it’s emailed too if you enter an
                    address. An app always keeps at least one owner.
                </P>
            </>
        ),
    },

    {
        slug: 'react-sdk',
        title: 'React SDK',
        group: 'Reference',
        summary: '@corven/connect-react: provider, hook and button.',
        sections: ['CorvenConnectProvider', 'useCorvenConnect', 'ConnectButton', 'Theming'],
        body: (
            <>
                <H2>CorvenConnectProvider</H2>
                <Table
                    head={['Prop', 'Default', 'Description']}
                    rows={[
                        [<C>appId</C>, 'required', 'Your app id (app_…).'],
                        [<C>apiUrl</C>, <C>{API}</C>, 'Point at your own Corven backend.'],
                        [<C>theme</C>, <C>'dark'</C>, <><C>'dark'</C>, <C>'light'</C> or <C>'auto'</C> (follows the OS).</>],
                        [<C>accent</C>, <C>#3cc68a</C>, 'Brand colour for buttons and highlights.'],
                        [<C>clients</C>, 'public nodes', <><C>{'{ TESTNET?, MAINNET? }'}</C> CCC clients.</>],
                        [<C>loadFonts</C>, <C>true</C>, 'Loads Geist from Google Fonts.'],
                        [<C>onLogin</C>, '', <><C>{'(user, { isNewUser }) => void'}</C>, after every sign-in.</>],
                        [<C>client</C>, '', <>Your own <C>CorvenConnect</C> instance instead of <C>appId</C>.</>],
                    ]}
                />

                <H2>useCorvenConnect</H2>
                <Table
                    head={['Field', 'Description']}
                    rows={[
                        [<C>ready</C>, 'False until the saved session has been checked.'],
                        [<C>authenticated</C>, 'True when someone is signed in.'],
                        [<C>user</C>, <>The signed-in <C>User</C>: identities, passkeys, wallets, <C>embeddedWallets</C>.</>],
                        [<C>config</C>, 'App name, logo, enabled methods and networks.'],
                        [<C>login()</C>, 'Opens the sign-in modal.'],
                        [<C>openWallet()</C>, 'Opens the wallet: balance, send, receive, export, sign-in methods.'],
                        [<C>closeModal()</C>, 'Closes the modal.'],
                        [<C>logout()</C>, 'Signs out on this device.'],
                        [<C>getSigner(network?)</C>, <>A CCC signer, <C>'TESTNET'</C> by default.</>],
                        [<C>externalWallet</C>, 'The user’s own wallet, when they signed in with one and it’s connected.'],
                        [<C>reconnectWallet()</C>, 'Asks their own wallet to connect again. Resolves to true when connected.'],
                        [<C>client</C>, <>The underlying <C>@corven/connect</C> client.</>],
                    ]}
                />

                <H2>ConnectButton</H2>
                <Table
                    head={['Prop', 'Default', 'Description']}
                    rows={[
                        [<C>label</C>, <C>'Sign in'</C>, 'Text when signed out.'],
                        [<C>network</C>, <C>'TESTNET'</C>, 'Which address to show when signed in.'],
                        [<C>className</C>, '', 'Extra classes.'],
                    ]}
                />

                <H2>Theming</H2>
                <P>
                    Pick <C>theme</C> and <C>accent</C> on the provider. Your app’s name and logo (from Settings) appear at
                    the top of the modal.
                </P>
            </>
        ),
    },

    {
        slug: 'core-sdk',
        title: 'Core SDK',
        group: 'Reference',
        summary: '@corven/connect: the framework-free client.',
        sections: ['Create a client', 'Sign in', 'Session and user', 'Wallets', 'Errors'],
        body: (
            <>
                <H2>Create a client</H2>
                <CodeBlock lang="ts" code={`import { createCorvenConnect } from '@corven/connect';

const connect = createCorvenConnect({
  appId: 'app_…',
  // apiUrl: '${API}',
  // storage: 'local' | 'memory' | yourStorage   (where the refresh token lives)
});

await connect.init(); // restores a saved session
connect.subscribe((state) => console.log(state.status, state.user));`} />

                <H2>Sign in</H2>
                <Table
                    head={['Method', 'Description']}
                    rows={[
                        [<C>{'sendCode({ phone, channel? } | { email })'}</C>, <>Sends a code. <C>channel</C>: <C>sms</C>, <C>whatsapp</C> or <C>call</C>.</>],
                        [<C>{'verifyCode({ phone | email, code })'}</C>, 'Signs in (or up) with the code.'],
                        [<C>loginWithGoogle(idToken)</C>, 'An ID token from Google Identity Services.'],
                        [<C>loginWithPasskey()</C>, 'Uses a passkey made on this domain.'],
                        [<C>{'loginWithSigner(signer, { walletName })'}</C>, 'A CCC signer for a wallet they already have.'],
                        [<C>addPasskey(name?)</C>, 'Adds a passkey for the signed-in user.'],
                        [<C>logout()</C>, 'Ends the session.'],
                    ]}
                />
                <P>
                    Pass <C>{'{ link: true }'}</C> to <C>verifyCode</C>, <C>loginWithGoogle</C> or <C>loginWithSigner</C> to add
                    the method to the signed-in user instead of signing in.
                </P>

                <H2>Session and user</H2>
                <Table
                    head={['Member', 'Description']}
                    rows={[
                        [<C>authState</C>, <><C>{"{ status: 'loading' | 'signed-out' | 'signed-in', user }"}</C></>],
                        [<C>user</C>, 'The signed-in user, or null.'],
                        [<C>me()</C>, 'Reloads the user.'],
                        [<C>setDisplayName(name)</C>, ''],
                        [<C>removeIdentity(id)</C>, 'Removes a sign-in method. At least one stays.'],
                        [<C>getAccessToken()</C>, 'A fresh access token, to send to your own backend.'],
                    ]}
                />
                <H3>Checking users on your backend</H3>
                <P>
                    Send <C>getAccessToken()</C> to your server and call <C>GET /connect/v1/me</C> with it. A valid token
                    returns the user; anything else is a 401.
                </P>
                <CodeBlock lang="ts" code={`const res = await fetch('${API}/me', {
  headers: { authorization: \`Bearer \${token}\`, 'x-corven-app': 'app_…' },
});
if (!res.ok) throw new Error('not signed in');
const user = await res.json();`} />

                <H2>Wallets</H2>
                <Table
                    head={['Method', 'Description']}
                    rows={[
                        [<C>getSigner(network?, client?)</C>, 'A CCC signer for the user’s wallet.'],
                        [<C>getWallets()</C>, 'Addresses, balances and recent activity.'],
                        [<C>setApprovalHandler(fn)</C>, <>Your own approval UI. Without one, testnet transactions are signed directly and mainnet ones are refused. The React SDK sets this for you.</>],
                        [<C>{'sendStepUpCode(method) / verifyStepUp(purpose, proof)'}</C>, 'The confirmation needed for mainnet signing and key export.'],
                        [<C>stepUpWithPasskey(purpose)</C>, ''],
                        [<C>stepUpWithSigner(purpose, signer)</C>, 'Confirm with a linked wallet.'],
                        [<C>exportPrivateKey(network, stepUpToken)</C>, ''],
                    ]}
                />

                <H2>Errors</H2>
                <P>
                    Calls throw <C>CorvenConnectError</C> with <C>status</C> (HTTP, or 0 for network errors) and a{' '}
                    <C>code</C>. Common codes:
                </P>
                <Table
                    head={['Code', 'Meaning']}
                    rows={[
                        [<C>unknown_app</C>, 'The app id doesn’t exist.'],
                        [<C>origin_not_allowed</C>, 'The page’s origin isn’t in Allowed origins.'],
                        [<C>method_disabled</C>, 'That sign-in method is turned off for the app.'],
                        [<C>wrong_code</C>, 'The code is wrong or expired.'],
                        [<C>rate_limited</C>, 'Too many attempts. Wait and try again.'],
                        [<C>identity_in_use</C>, 'That phone, email or account belongs to another user.'],
                        [<C>step_up_required</C>, 'Confirm first (mainnet signing, key export).'],
                        [<C>mainnet_disabled</C>, 'Mainnet isn’t turned on for the app.'],
                        [<C>not_your_inputs</C>, 'The transaction spends cells that aren’t the user’s.'],
                        [<C>user_rejected</C>, <>They rejected the request (<C>UserRejectedError</C>).</>],
                    ]}
                />
            </>
        ),
    },

    {
        slug: 'api',
        title: 'REST API',
        group: 'Reference',
        summary: 'The HTTP API behind the SDKs.',
        sections: ['Basics', 'Endpoints', 'Security model'],
        body: (
            <>
                <H2>Basics</H2>
                <UL>
                    <li>Base URL: <C>{API}</C></li>
                    <li>Every request sends the header <C>x-corven-app: app_…</C>. Requests from browsers must come from an allowed origin; server-to-server calls (no <C>Origin</C> header) are fine.</li>
                    <li>Signed-in calls send <C>Authorization: Bearer &lt;accessToken&gt;</C>.</li>
                    <li>Sign-in responses are <C>{'{ accessToken, refreshToken, isNewUser, user }'}</C>. Errors are <C>{'{ statusCode, message, code }'}</C>.</li>
                </UL>
                <Callout>The SDKs handle all of this. Use the API directly only for other platforms or your own backend.</Callout>

                <H2>Endpoints</H2>
                <Table
                    head={['Method', 'Path', 'Body / notes']}
                    rows={[
                        ['GET', <C>/config</C>, 'Name, methods, Google client id, networks.'],
                        ['POST', <C>/auth/code/send</C>, <><C>{'{ phone, channel? }'}</C> or <C>{'{ email }'}</C></>],
                        ['POST', <C>/auth/code/verify</C>, <><C>{'{ phone | email, code }'}</C>. With a bearer token it links instead.</>],
                        ['POST', <C>/auth/google</C>, <C>{'{ credential }'}</C>],
                        ['POST', <C>/auth/passkey/options</C>, <>Then <C>/auth/passkey/verify</C> with <C>{'{ response, challengeToken }'}</C>.</>],
                        ['POST', <C>/auth/wallet/challenge</C>, <><C>{'{ address }'}</C> (testnet). Returns the message to sign.</>],
                        ['POST', <C>/auth/wallet/verify</C>, <C>{'{ challengeToken, signature, walletName? }'}</C>],
                        ['POST', <C>/auth/refresh</C>, <><C>{'{ refreshToken }'}</C>. Rotates the token.</>],
                        ['POST', <C>/auth/logout</C>, <C>{'{ refreshToken }'}</C>],
                        ['GET / PATCH', <C>/me</C>, <C>{'{ displayName }'}</C>],
                        ['DELETE', <C>/me/identities/:id</C>, 'Keeps at least one method.'],
                        ['POST', <C>/me/passkeys/options</C>, <>Then <C>POST /me/passkeys</C>.</>],
                        ['POST', <C>/step-up/code/send</C>, <C>{'{ method: PHONE | EMAIL }'}</C>],
                        ['POST', <C>/step-up/verify</C>, <><C>{'{ purpose: sign | export, method, … }'}</C>. Returns <C>{'{ stepUpToken }'}</C>.</>],
                        ['GET', <C>/wallets</C>, 'Balances and activity.'],
                        ['POST', <C>/wallets/sign</C>, <C>{'{ network, transaction, stepUpToken? }'}</C>],
                        ['POST', <C>/wallets/export</C>, <C>{'{ network, stepUpToken }'}</C>],
                    ]}
                />

                <H2>Security model</H2>
                <UL>
                    <li>Users, identities and wallets are per app. One app’s tokens are refused by another.</li>
                    <li>Refresh tokens are stored hashed and rotate on every use. Reusing an old one revokes the whole session.</li>
                    <li>Wallet keys use AES-256-GCM envelope encryption. The master key never touches the database.</li>
                    <li>Signing looks up every input on chain and only signs transactions that spend the user’s own cells.</li>
                    <li>Mainnet needs a fresh, single-use confirmation and is capped per user per day. Key export needs its own confirmation.</li>
                    <li>Code sends and checks are rate-limited per IP address and per phone or email.</li>
                </UL>
            </>
        ),
    },
];

export const DOC_GROUPS: DocPage['group'][] = ['Getting started', 'Guides', 'Reference'];

export function findDoc(slug: string | undefined): DocPage | undefined {
    return DOCS.find((d) => d.slug === (slug ?? 'introduction'));
}
