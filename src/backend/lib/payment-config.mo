import PCTypes "../types/payment-config";

module {
  public type PaymentConfig = PCTypes.PaymentConfig;

  /// Returns the default empty PaymentConfig used on first boot.
  public func defaultConfig() : PaymentConfig {
    {
      razorpayKeyId     = "";
      razorpayKeySecret = "";
      upiVpa            = "";
      qrCodeUrl         = "";
    };
  };
};
