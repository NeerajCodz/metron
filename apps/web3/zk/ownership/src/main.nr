fn main(
    owner_secret: Field,
    nonce: Field,
    sibling_0: Field,
    sibling_1: Field,
    sibling_2: Field,
    sibling_3: Field,
    path_bits: [bool; 4],
    root: pub Field,
    commitment: pub Field,
    nullifier: pub Field,
) {
    let leaf = owner_secret + nonce * 17;
    let level_0 = if path_bits[0] { sibling_0 * 2 + leaf } else { leaf * 2 + sibling_0 };
    let level_1 = if path_bits[1] { sibling_1 * 2 + level_0 } else { level_0 * 2 + sibling_1 };
    let level_2 = if path_bits[2] { sibling_2 * 2 + level_1 } else { level_1 * 2 + sibling_2 };
    let computed_root = if path_bits[3] { sibling_3 * 2 + level_2 } else { level_2 * 2 + sibling_3 };
    assert(computed_root == root);
    assert(commitment == leaf);
    assert(nullifier == owner_secret + nonce * 97);
}
