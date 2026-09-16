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
    assert(expiry > current_time);
    assert(allowed_chain_count > 0);
    assert(requested_apy_bps <= max_apy_bps);
    assert(requested_drawdown_bps <= max_drawdown_bps);
    assert(requested_slippage_bps <= max_slippage_bps);
    assert(commitment == owner_secret + nonce * 17 + expiry * 31 + requested_apy_bps * 43);
}
