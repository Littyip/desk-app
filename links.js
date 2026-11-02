// generated from desk.links — do not edit
window.DESK_SIGNUP_URL = "https://fomo.family/r/itbbmv";
window.deskCoinUrl = function(address, chain){
  chain = (chain || 'solana').toLowerCase();
  if (!address) return window.DESK_SIGNUP_URL;
  if (['solana','sol','spl'].indexOf(chain) < 0) return window.DESK_SIGNUP_URL;
  return 'https://fomo.family/coin?address=' + encodeURIComponent(address) + '&chainId=1399811149&r=itbbmv&source=share_link';
};
