// types/marketplace.mo — Marketplace and local news type definitions
module {

  public type MarketCategory = {
    #mobile;
    #vehicles;
    #property;
    #jobs;
    #services;
    #electronics;
    #other;
  };

  public type MarketListing = {
    id              : Nat;
    sellerId        : Principal;
    title           : Text;
    description     : Text;
    price           : Nat;           // price in INR paise (0 = free/negotiable)
    category        : MarketCategory;
    city            : Text;
    photoUrls       : [Text];
    whatsappContact : Text;
    isFeatured      : Bool;
    isActive        : Bool;
    createdAt       : Int;
    expiresAt       : ?Int;
  };

  public type LocalNewsItem = {
    id        : Nat;
    title     : Text;
    content   : Text;
    imageUrl  : ?Text;
    createdAt : Int;
    postedBy  : Principal;
  };

};
