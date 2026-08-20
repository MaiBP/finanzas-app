// Category used for the transactions the app creates on the user's behalf (new account with an
// initial balance, manual balance correction) rather than ones the user typed themselves. These
// hold the account's balance together, so Movimientos hides edit/delete for rows in this category
// instead of letting them be changed like a normal expense or income.
export const SYNTHETIC_BALANCE_CATEGORY = "Ajuste de saldo";
