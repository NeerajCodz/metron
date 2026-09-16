fn main(
    owner_secret: Field,
    nonce: Field,
    current_time: pub Field,
    expiry: pub Field,
    max_apy_bps: pub Field,
    requested_apy_bps: pub Field,
    max_drawdown_bps: pub Field,
    requested_drawdown_bps: pub Field,
    max_slippage_bps: pub Field,
    requested_slippage_bps: pub Field,
    allowed_chain_count: pub Field,
    commitment: pub Field,
) {
    let current_time_u64: u64 = current_time as u64;
    let expiry_u64: u64 = expiry as u64;
    let allowed_chain_count_u64: u64 = allowed_chain_count as u64;
    let max_apy_bps_u64: u64 = max_apy_bps as u64;
    let requested_apy_bps_u64: u64 = requested_apy_bps as u64;
    let max_drawdown_bps_u64: u64 = max_drawdown_bps as u64;
    let requested_drawdown_bps_u64: u64 = requested_drawdown_bps as u64;
    let max_slippage_bps_u64: u64 = max_slippage_bps as u64;
    let requested_slippage_bps_u64: u64 = requested_slippage_bps as u64;
    assert(expiry_u64 > current_time_u64);
    assert(allowed_chain_count_u64 > 0);
    assert(requested_apy_bps_u64 <= max_apy_bps_u64);
    assert(requested_drawdown_bps_u64 <= max_drawdown_bps_u64);
    assert(requested_slippage_bps_u64 <= max_slippage_bps_u64);
    assert(commitment == owner_secret + nonce * 17 + expiry * 31 + requested_apy_bps * 43);
}
