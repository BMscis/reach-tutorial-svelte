<script>
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import { loadStdlib } from "@reach-sh/stdlib";
    import Participants from "./Participants.svelte";
    import { accountStore, reachStore} from "../Stores/accountStore";

    let blockchain = ["ETH", "ALGO"];
    let selectedBlockchain = "";

    let accountName = "";
    let accountBalance = 0;
    let myAccount = {};

    //const { standardUnit } = reach;
    //const defaults = { defaultFundAmt: "10", defaultWager: "3", standardUnit };
    let nextStep = false;
    let fundAmount = 0;
    let canFund = false;

    const handleSubmit = () => {
        console.log("selected: ", selectedBlockchain);
        nextStep = true;
    };
    const getBalance = async (balAcc) => {
        let balAtomic = await reach.balanceOf(balAcc);
        let bal = reach.formatCurrency(balAtomic, 4);
        return bal;
    };
    async function loadDefault() {
        const reach = loadStdlib(selectedBlockchain);
        reachStore.set({reach:reach})
        const acc = await reach.getDefaultAccount();
        const bal = await getBalance(acc);
        
        myAccount = acc;
        accountStore.set({
            account: acc.networkAccount.address,
            balance: bal,
            container: acc,
        });
        canFund = await reach.canFundFromFaucet();
        console.log("CAN FUND: ", canFund);
    }
    async function fundAccount() {
        try {
            await reach.fundFromFaucet(
                get(accountStore).container,
                reach.parseCurrency(fundAmount)
            );
            accountStore.set({
                account: myAccount.networkAccount.address,
                balance: await getBalance(myAccount),
                container: myAccount,
            });
        } catch (error) {
            console.log(error);
        }
        //this.setState({ view: "DeployerOrAttacher" });
    }
    onMount(() => {
        return accountStore.subscribe((value) => {
            accountName = value.account;
            accountBalance = value.balance;
            console.log(value);
        });
    });
</script>

{#if nextStep == false}
    <form on:submit|preventDefault={() => {handleSubmit()}}>
        <label for="blockchain">Select Blockchain
        <select id="blockchain" bind:value={selectedBlockchain}>
            {#each blockchain as chain}
                <option>{chain}</option>
            {/each}
        </select>
    </label>
        <button type="submit">SUBMIT</button>
    </form>
{:else if nextStep == true}
    {#await loadDefault()}
        <h1>ASP</h1>
    {/await}
    <div >
        <div >
            <span>
                <div>
                    <span>Name: </span>
                    <span>{accountName}</span>
                </div>
                <div>
                    <span>Balance: </span>
                    <span>{accountBalance}</span>
                </div>
            </span>
        </div>
        <div>
            <span>
                <h2>FUND ACCOUNT</h2>
            </span>
            <form on:submit|preventDefault={() => {fundAccount()}}>
                <label for="input-funds">Fund Account
                <input
                    bind:value={fundAmount}
                    type="number"
                    id="input-funds"
                    on:input={console.log(fundAmount)}
                />
                <button type="submit"> FUND </button>
            </label>
            </form>
        </div>
        <div>
            {#if accountBalance > 0}
                <Participants />
            {/if}
        </div>
    </div>
{/if}

<style>
    span {
        white-space: nowrap;
    }
</style>
