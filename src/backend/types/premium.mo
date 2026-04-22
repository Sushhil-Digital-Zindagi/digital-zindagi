// types/premium.mo — Premium subscription type definitions
module {

  public type PremiumPlan = {
    #monthly;
    #quarterly;
    #annual;
  };

  public type PaymentMethod = {
    #stripe;
    #upi;
  };

  public type PremiumSubscription = {
    userId               : Principal;
    plan                 : PremiumPlan;
    startedAt            : Int;
    expiresAt            : Int;
    paymentMethod        : PaymentMethod;
    stripeSubscriptionId : ?Text;
    isActive             : Bool;
  };

  public type UpiPaymentRequest = {
    id         : Nat;
    userId     : Principal;
    plan       : PremiumPlan;
    amount     : Nat;          // INR paise
    upiTxnRef  : Text;
    status     : { #pending; #approved; #rejected };
    createdAt  : Int;
  };

  public type PremiumPrices = {
    monthly   : Nat;   // INR paise
    quarterly : Nat;
    annual    : Nat;
  };

};
