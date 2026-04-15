// mixins/payment-config-api.mo — Payment Configuration public API helpers
import AccessControl "mo:caffeineai-authorization/access-control";
import PCTypes       "../types/payment-config";

module {

  public type PaymentConfig = PCTypes.PaymentConfig;

  /// Returns the current payment configuration.
  /// Readable by all callers — providers and riders need to display UPI/QR.
  public func getPaymentConfig(
    config : PCTypes.PaymentConfig,
  ) : PCTypes.PaymentConfig {
    config;
  };

  /// Validates and returns a new config if authorized.
  /// Returns #err if caller is not admin.
  public func validateSetPaymentConfig(
    accessControlState : AccessControl.AccessControlState,
    caller             : Principal,
    config             : PCTypes.PaymentConfig,
  ) : { #ok : PCTypes.PaymentConfig; #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      return #err("Unauthorized: Only admins can update payment config");
    };
    #ok(config);
  };

};
