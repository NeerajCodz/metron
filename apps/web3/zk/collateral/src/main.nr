fn main(
    collateral_value: Field,
    blinding: Field,
    minimum_collateral: pub Field,
    commitment: pub Field,
) {
    assert(collateral_value >= minimum_collateral);
    assert(commitment == collateral_value + blinding * 101);
}
