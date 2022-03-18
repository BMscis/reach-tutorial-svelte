<script>
	import WalletView from "./Views/WalletView.svelte"
	async function loginOrCreate() {
		try {
			const accounts = await myAlgoWallet.connect();
			const addresses = accounts.map((acc) => acc.address);
			// const acc = await reach.getDefaultAccount();
			// const balAtomic = await reach.balanceOf(acc);
			// const bal = reach.formatCurrency(balAtomic, 4);
			//accountStore.set({ account: accounts, balance: addresses });
			console.log("ACC: ", accounts);
			console.log("ADD: ", addresses);
			// if (await reach.canFundFromFaucet()) {
			// 	console.log("Fund acc");
			// } else {
			// 	console.log("Deploy contract");
			// }
		} catch (err) {
			console.log(err);
			console.log("ALGO FAILED BRO");
		}
	}
</script>

<main>
	<WalletView></WalletView>
</main>

<style>
</style>
