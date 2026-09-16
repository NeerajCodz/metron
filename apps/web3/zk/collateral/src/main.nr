fn main(
    collateral_value: Field,
    blinding: Field,
    minimum_collateral: pub Field,
    commitment: pub Field,
) {
    let collateral_value_u64: u64 = collateral_value as u64;
    let minimum_collateral_u64: u64 = minimum_collateral as u64;
    assert(collateral_value_u64 >= minimum_collateral_u64);
    assert(commitment == collateral_value + blinding * 101);
}
