// Payment handling module
const PAYMENT_API = 'https://trip-advisor-3.onrender.com/api/payments/process';

class PaymentHandler {
    constructor() {
        this.selectedPaymentMethod = 'pm_card_visa';
        this.selectedPlan = 'PRO';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateSummary();
    }

    setupEventListeners() {
        // Payment method selection
        document.querySelectorAll('.payment-method-card').forEach(card => {
            card.addEventListener('click', (e) => this.selectPaymentMethod(e.currentTarget));
        });

        // Subscription plan selection
        document.querySelectorAll('.subscription-plan-card').forEach(card => {
            card.addEventListener('click', (e) => this.selectSubscriptionPlan(e.currentTarget));
        });

        // Currency selection
        const currencyElem = document.getElementById('currency');
        if (currencyElem) currencyElem.addEventListener('change', () => this.updateSummary());

        // Form submission
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) paymentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.processPayment();
        });

        this.setupValidation();
    }

    selectPaymentMethod(selectedCard) {
        document.querySelectorAll('.payment-method-card').forEach(card => {
            card.classList.remove('selected');
            const checkIcon = card.querySelector('.fa-check-circle');
            if (checkIcon) checkIcon.style.display = 'none';
        });

        selectedCard.classList.add('selected');
        const checkIcon = selectedCard.querySelector('.fa-check-circle') || this.createCheckIcon(selectedCard);
        checkIcon.style.display = 'inline';

        this.selectedPaymentMethod = selectedCard.dataset.method;
        const paymentInput = document.getElementById('paymentMethodId');
        if (paymentInput) paymentInput.value = this.selectedPaymentMethod;

        this.updateSummary();
    }

    createCheckIcon(card) {
        const checkIcon = document.createElement('i');
        checkIcon.className = 'fas fa-check-circle text-success ms-auto';
        const container = card.querySelector('.d-flex');
        if (container) container.appendChild(checkIcon);
        return checkIcon;
    }

    selectSubscriptionPlan(selectedCard) {
        document.querySelectorAll('.subscription-plan-card').forEach(card => card.classList.remove('selected'));
        selectedCard.classList.add('selected');

        this.selectedPlan = selectedCard.dataset.plan;
        const planInput = document.getElementById('selectedPlan');
        if (planInput) planInput.value = this.selectedPlan;

        const planPrice = parseFloat(selectedCard.dataset.price);
        const amountInput = document.getElementById('amount');
        if (amountInput) amountInput.value = planPrice;

        this.updateSummary();
    }

    updateSummary() {
        const amount = parseFloat(document.getElementById('amount')?.value) || 0;
        const currency = document.getElementById('currency')?.value || 'usd';
        const paymentMethodText = this.getPaymentMethodText();

        const summaryAmount = document.getElementById('summaryAmount');
        const summaryCurrency = document.getElementById('summaryCurrency');
        const summaryMethod = document.getElementById('summaryMethod');
        const summaryPlan = document.getElementById('summaryPlan');
        const summaryTotal = document.getElementById('summaryTotal');

        if (summaryAmount) summaryAmount.textContent = this.formatCurrency(amount, currency);
        if (summaryCurrency) summaryCurrency.textContent = currency.toUpperCase();
        if (summaryMethod) summaryMethod.textContent = paymentMethodText;
        if (summaryPlan) summaryPlan.textContent = this.selectedPlan;
        if (summaryTotal) summaryTotal.textContent = this.formatCurrency(amount, currency);
    }

    getPaymentMethodText() {
        const methodMap = {
            'pm_card_visa': 'Visa Card',
            'pm_card_mastercard': 'Mastercard',
            'pm_card_amex': 'American Express'
        };
        return methodMap[this.selectedPaymentMethod] || 'Card';
    }

    formatCurrency(amount, currency) {
        const symbols = { 'usd': '$', 'eur': '€', 'gbp': '£', 'cad': 'C$' };
        const symbol = symbols[currency] || '$';
        return `${symbol}${amount.toFixed(2)}`;
    }

    setupValidation() {
        // Form validation can be extended if needed
    }

    async processPayment() {
        const form = document.getElementById('paymentForm');
        if (!form || !form.checkValidity()) {
            if (form) form.classList.add('was-validated');
            return;
        }

        const amount = parseFloat(document.getElementById('amount')?.value) || 0;
        const currency = document.getElementById('currency')?.value || 'usd';

        if (amount <= 0) {
            this.showError('Please select a subscription plan');
            return;
        }

        const token = auth?.getToken();
        const currentUser = auth?.getCurrentUser();

        if (!token || !currentUser) {
            this.showError('Authentication required. Please log in again.');
            window.location.href = '/html/signin.html';
            return;
        }

        this.showProcessingOverlay();

        try {
            const paymentData = {
                amount: amount,
                currency: currency,
                paymentMethodId: this.selectedPaymentMethod,
                paymentType: "gateway",
                sub
