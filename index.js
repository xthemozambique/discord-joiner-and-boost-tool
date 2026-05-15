// this has been patched 
// to purchase a private working joiner and boost tool, contact me on discord @uutu or telegram @tahagorme

//Importing Modules
const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const { ProxyAgent } = require('proxy-agent');
const chalk = require('chalk');

// Config
const config = require('./config');
let invite = config.invite;
let captcha_key = config.owo_solver_key;
let captcha_retry_limit = config.captcha_retry_limit;
let join_delay_min = config.join_delay_min;
let join_delay_max = config.join_delay_max;

//Error Handling
process.on('unhandledRejection', (error) => {
    console.error(chalk.bold.red('Unhandled Rejection:'));
    console.error(chalk.red(error));
    console.error(chalk.bold.red('Error Stack:'));
    console.error(chalk.red(error.stack));

})
process.on('uncaughtException', (error) => {
    console.error(chalk.bold.red('Uncaught Exception:'));
    console.error(chalk.red(error));
    console.error(chalk.bold.red('Error Stack:'));
    console.error(chalk.red(error.stack));
})

//Initializing Variables
let proxies = fs.readFileSync('proxies.txt', 'utf8').replace(/\r/g, '').split('\n').filter(x => x);

let isUsingProxy = proxies.length > 0;
let joined = 0;
let failed = 0;
let i = 0;
let j = 0;
let tokens = fs.readFileSync('tokens.txt', 'utf8').replace(/\r/g, '').split('\n').filter(x => x);
const OWO_SOLVER_BASE_URL = 'https://owosolver.web.id';



console.log(chalk.magenta(`Token Joiner and Booster by ${chalk.yellowBright(chalk.underline('@tahagorme'))}!`));
console.log(chalk.green(`Started the program with ${chalk.blueBright(chalk.underline(tokens.length))} tokens and ${chalk.blueBright(chalk.underline(isUsingProxy ? 'Proxy' : 'No Proxy'))}!`));

tokens.forEach(token => {
    setTimeout(async () => {
        j++;
        await join(token, j == tokens.length);
    }, randomInt(join_delay_min, join_delay_max) * (++i));
});

async function join(token, isLast) {
    let randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
    const proxy = isUsingProxy ? new ProxyAgent(randomProxy) : undefined;

    const client = new Client({
        captchaSolver: function (captcha, UA) {
            return solveCaptchaWithOwoSolver(captcha, UA);
        },
        captchaRetryLimit: captcha_retry_limit,
        ws: {
            agent: proxy,
        },
        http: {
            agent: proxy,
        },

    });
    client.on('ready', async () => {
        console.log(chalk.green(`Logged in as ${chalk.blue(chalk.underline(client.user.tag))}!`));
        await client.acceptInvite(invite).then(() => {

            console.log(chalk.green(`Joined ${chalk.blueBright(chalk.underline(invite))} from ${chalk.blueBright(chalk.underline(client.user.tag))}!`));


            joined++;
            if (isLast) {
                console.log(chalk.green(`Joined: ${chalk.blueBright(chalk.underline(joined))}\nFailed: ${chalk.redBright(chalk.underline(failed))}`));
            }





            if (config.boost.enabled) {
                setTimeout(async () => {
                    const allBoosts = await client.billing.fetchGuildBoosts()
                    allBoosts.each(async (boost) => {
                        await boost.unsubscribe().catch((err) => { })
                        setTimeout(async () => {
                            await boost.subscribe(config.boost.server_id)
                            console.log(chalk.green(`Boosted ${chalk.blueBright(chalk.underline(client.user.tag))} in ${chalk.blueBright(chalk.underline(config.boost.server_id))}!`));
                        }, 500)
                    })
                }, randomInt(config.boost.delay_min, config.boost.delay_max))
            }



        }).catch((error) => {
            console.log(chalk.red(`Failed to join ${chalk.blueBright(chalk.underline(invite))} as ${chalk.blueBright(chalk.underline(client.user.tag))}!`));
            failed++;
            console.log(chalk.red(`Error: ${error}`));
            if (isLast) {
                console.log(chalk.green(`Joined: ${chalk.blueBright(chalk.underline(joined))}\nFailed: ${chalk.redBright(chalk.underline(failed))}`));
            }
        });
    });

    client.login(token).catch((error) => {
        if (error.toString()?.includes("INVALID") && error.toString()?.includes("TOKEN")) {
            console.log(chalk.red(`Invalid Token: ${chalk.blueBright(chalk.underline(token))}`));
            
            fs.writeFileSync('tokens.txt', fs.readFileSync('tokens.txt', 'utf8').replace(token + '\n', ''));
            console.log(`Removed invalid token: ${chalk.blueBright(chalk.underline(token))} from tokens.txt!`);

        }
    });
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function solveCaptchaWithOwoSolver(captcha, userAgent) {
    const createTaskResponse = await fetch(`${OWO_SOLVER_BASE_URL}/createTask`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            clientKey: captcha_key,
            task: {
                type: 'HCaptchaTaskProxyLess',
                websiteURL: 'https://discord.com',
                websiteKey: captcha.captcha_sitekey,
                isInvisible: true,
                enterprisePayload: {
                    rqdata: captcha.captcha_rqdata,
                },
                userAgent,
            },
        }),
    });

    const createTaskData = await createTaskResponse.json();

    if (createTaskData.errorId && createTaskData.errorId !== 0) {
        throw new Error(`OwoSolver createTask failed: ${createTaskData.errorCode || createTaskData.errorDescription || 'Unknown error'}`);
    }

    const taskId = createTaskData.taskId;
    if (!taskId) {
        throw new Error('OwoSolver createTask failed: missing taskId in response');
    }

    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const getResultResponse = await fetch(`${OWO_SOLVER_BASE_URL}/getTaskResult`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                clientKey: captcha_key,
                taskId,
            }),
        });

        const getResultData = await getResultResponse.json();

        if (getResultData.errorId && getResultData.errorId !== 0) {
            throw new Error(`OwoSolver getTaskResult failed: ${getResultData.errorCode || getResultData.errorDescription || 'Unknown error'}`);
        }

        if (getResultData.status === 'ready') {
            const token = getResultData.solution?.gRecaptchaResponse || getResultData.solution?.token;
            if (!token) {
                throw new Error('OwoSolver returned ready status but no captcha token was found');
            }
            return token;
        }
    }

    throw new Error('OwoSolver timed out while waiting for captcha solution');
}
