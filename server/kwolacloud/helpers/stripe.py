import stripe
from .auth0 import getUserProfileFromId
from ..config.config import loadCloudConfiguration


def attachPaymentMethodToUserAccountIfNeeded(paymentMethodId, stripeCustomerId):
    newPaymentMethod = stripe.PaymentMethod.retrieve(paymentMethodId)

    existingPaymentMethods = stripe.PaymentMethod.list(
        customer=stripeCustomerId,
        type='card'
    ).data

    foundMatching = False
    for method in existingPaymentMethods:
        if method.card.fingerprint == newPaymentMethod.card.fingerprint:
            foundMatching = True

    if not foundMatching:
        stripe.PaymentMethod.attach(
            paymentMethodId,
            customer=stripeCustomerId,
        )

        stripe.Customer.modify(
          stripeCustomerId,
          invoice_settings={"default_payment_method": paymentMethodId}
        )

def getPriceIdForUser(userId, priceField):
    profile_data = getUserProfileFromId(userId)
    config = loadCloudConfiguration()

    if 'user_metadata' in profile_data and 'subscriptionPackageMode' in profile_data['user_metadata']:
        return config['stripe']['oldPackages'][profile_data['user_metadata']['subscriptionPackageMode']][priceField]
    else:
        return config['stripe'][priceField]
