import stripe




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
