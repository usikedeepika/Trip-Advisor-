// ==============================
// AUTH HELPER (assumes auth object exists)
// ==============================
const auth = {
    getToken() {
        return localStorage.getItem('JWT_TOKEN');
    },
    getCurrentUser() {
        const user = localStorage.getItem('CURRENT_USER');
        return user ? JSON.parse(user) : null;
    },
    isAuthenticated() {
        return !!this.getToken() && !!this.getCurrentUser();
    },
    async request(url, options = {}) {
        return fetch(url, options);
    }
};

// ==============================
// ITINERARY MODULE
// ==============================
class ItineraryService {
    constructor() {
        this.apiEndpoint = '/api/itineraries';
    }

    async saveItinerary(itineraryData, userId) {
        const token = auth.getToken();
        if (!token) throw new Error('Authentication required');
        if (!userId) throw new Error('User ID required');

        const url = `${this.apiEndpoint}?userId=${encodeURIComponent(userId)}`;
        const body = JSON.stringify({
            destination: itineraryData.destination,
            fullItinerary: itineraryData.fullItinerary,
            startDate: itineraryData.startDate || null,
            endDate: itineraryData.endDate || null,
            numberOfDays: itineraryData.numberOfDays || null,
            budgetRange: itineraryData.budgetRange || null,
            travelStyle: itineraryData.travelStyle || null
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    async getUserItineraries(userId) {
        const token = auth.getToken();
        const user = auth.getCurrentUser();
        if (!token || !user) throw new Error('Authentication required');
        if (!userId) throw new Error('User ID required');

        const url = `${this.apiEndpoint}?userId=${encodeURIComponent(userId)}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'userName': user.userName }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    async searchItineraries(userId, searchTerm) {
        const token = auth.getToken();
        const user = auth.getCurrentUser();
        if (!token || !user) throw new Error('Authentication required');
        if (!userId) throw new Error('User ID required');
        if (!searchTerm || searchTerm.trim() === '') throw new Error('Search term is required');

        const url = `/api/itineraries/search?userId=${encodeURIComponent(userId)}&searchTerm=${encodeURIComponent(searchTerm.trim())}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'userName': user.userName }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
        }

        return response.json();
    }
}

const itineraryService = new ItineraryService();

async function saveUserItinerary(destination, fullItinerary, options = {}) {
    try {
        const user = auth.getCurrentUser();
        if (!user) throw new Error('User not logged in');

        const itineraryData = {
            destination,
            fullItinerary,
            startDate: options.startDate,
            endDate: options.endDate,
            numberOfDays: options.numberOfDays,
            budgetRange: options.budgetRange,
            travelStyle: options.travelStyle
        };

        const result = await itineraryService.saveItinerary(itineraryData, user.id);
        showNotification('Itinerary saved!', 'success');
        return result;
    } catch (error) {
        console.error(error);
        showNotification(`Failed to save itinerary: ${error.message}`, 'error');
        throw error;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 12px 20px;
        border-radius: 4px; color: white; font-weight: bold; z-index: 1000;
        opacity: 0; transition: opacity 0.3s ease;
        background-color: ${type==='success'?'#4CAF50':type==='error'?'#f44336':'#2196F3'};
    `;
    document.body.appendChild(notification);
    setTimeout(()=> notification.style.opacity='1', 100);
    setTimeout(()=> { notification.style.opacity='0'; setTimeout(()=>document.body.removeChild(notification),300)}, 3000);
}

// ==============================
// PAYMENT MODULE
// ==============================
class PaymentHandler {
    constructor() {
        this.selectedPaymentMethod = 'pm_card_visa';
        this.selectedPlan = 'PRO';
        this.apiEndpoint = '/api/payments/process';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateSummary();
    }

    setupEventListeners() {
        document.querySelectorAll('.payment-method-card').forEach(card =>
            card.addEventListener('click', e => this.selectPaymentMethod(e.currentTarget))
        );
        document.querySelectorAll('.subscription-plan-card').forEach(card =>
            card.addEventListener('click', e => this.selectSubscriptionPlan(e.currentTarget))
        );
        const currencyEl = document.getElementById('currency');
        if(currencyEl) currencyEl.addEventListener('change', ()=>this.updateSummary());
        const form = document.getElementById('paymentForm');
        if(form) form.addEventListener('submit', e => { e.preventDefault(); this.processPayment(); });
    }

    selectPaymentMethod(card){
        document.querySelectorAll('.payment-method-card').forEach(c=>{c.classList.remove('selected'); c.querySelector('.fa-check-circle')?.style.display='none'});
        card.classList.add('selected');
        let checkIcon = card.querySelector('.fa-check-circle');
        if(!checkIcon){
            checkIcon = document.createElement('i');
            checkIcon.className = 'fas fa-check-circle text-success ms-auto';
            card.querySelector('.d-flex')?.appendChild(checkIcon);
        }
        checkIcon.style.display='inline';
        this.selectedPaymentMethod = card.dataset.method;
        document.getElementById('paymentMethodId').value = this.selectedPaymentMethod;
        this.updateSummary();
    }

    selectSubscriptionPlan(card){
        document.querySelectorAll('.subscription-plan-card').forEach(c=>c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedPlan = card.dataset.plan;
        document.getElementById('selectedPlan').value = this.selectedPlan;
        document.getElementById('amount').value = parseFloat(card.dataset.price);
        this.updateSummary();
    }

    updateSummary(){
        const amount = parseFloat(document.getElementById('amount')?.value)||0;
        const currency = document.getElementById('currency')?.value || 'usd';
        document.getElementById('summaryAmount').textContent = this.formatCurrency(amount, currency);
        document.getElementById('summaryCurrency').textContent = currency.toUpperCase();
        document.getElementById('summaryMethod').textContent = this.getPaymentMethodText();
        document.getElementById('summaryPlan').textContent = this.selectedPlan;
        document.getElementById('summaryTotal').textContent = this.formatCurrency(amount, currency);
    }

    getPaymentMethodText(){
        return {'pm_card_visa':'Visa','pm_card_mastercard':'Mastercard','pm_card_amex':'AmEx'}[this.selectedPaymentMethod]||'Card';
    }

    formatCurrency(amount,currency){
        return {'usd':'$','eur':'€','gbp':'£','cad':'C$'}[currency]||'$'+amount.toFixed(2);
    }

    async processPayment(){
        const form = document.getElementById('paymentForm');
        if(!form.checkValidity()){form.classList.add('was-validated'); return;}
        const amount=parseFloat(document.getElementById('amount')?.value);
        const currency=document.getElementById('currency')?.value||'usd';
        if(!amount||amount<=0){this.showError('Select a plan'); return;}
        const token=auth.getToken(), user=auth.getCurrentUser();
        if(!token||!user){this.showError('Authentication required'); window.location.href='signin.html'; return;}
        this.showProcessingOverlay();
        try{
            const paymentData={amount,currency,paymentMethodId:this.selectedPaymentMethod,paymentType:"gateway",subscriptionPlan:this.selectedPlan};
            const res = await fetch(this.apiEndpoint,{method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`,'userName':user.userName}, body:JSON.stringify(paymentData)});
            const result = await res.json();
            if(res.ok){
                user.membershipPlan=this.selectedPlan; localStorage.setItem('CURRENT_USER',JSON.stringify(user));
                this.showSuccess(result,paymentData);
                setTimeout(()=>window.location.href='home.html',3000);
            }else throw new Error(result.message||'Payment failed');
        }catch(e){console.error(e); this.showError(e.message);} finally{this.hideProcessingOverlay();}
    }

    showProcessingOverlay(){document.getElementById('processingOverlay').style.display='flex';}
    hideProcessingOverlay(){document.getElementById('processingOverlay').style.display='none';}

    showSuccess(result,paymentData){
        const div=document.getElementById('paymentResult');
        div.innerHTML=`
            <div class="alert alert-success shadow-sm">
                <h4>Payment Successful!</h4>
                <p>Transaction ID: ${result.transactionId||result.id||'N/A'}</p>
                <p>Amount: ${this.formatCurrency(paymentData.amount,paymentData.currency)} ${paymentData.currency.toUpperCase()}</p>
                <p>Plan: ${this.selectedPlan}</p>
            </div>`;
        div.style.display='block'; div.scrollIntoView({behavior:'smooth'});
    }

    showError(msg){const div=document.getElementById('paymentResult'); div.innerHTML=`<div class="alert alert-danger">${msg}</div>`; div.style.display='block'; div.scrollIntoView({behavior:'smooth'});}
}

let paymentHandler;
document.addEventListener('DOMContentLoaded',()=>{paymentHandler=new PaymentHandler();});
window.paymentHandler = paymentHandler;

// ==============================
// REVIEW MODULE
// ==============================
const REVIEW_API = '/api/review';

const reviews = {
    async loadReviews(){
        try{
            const user=auth.getCurrentUser(), token=auth.getToken();
            if(!token) throw new Error('Authentication required');
            const res=await auth.request(REVIEW_API,{method:'GET',headers:{'Authorization':`Bearer ${token}`,'username':user.userName}});
            if(!res.ok) throw new Error(`Failed to load reviews: ${res.status}`);
            const data=await res.json(); this.displayReviews(data.data);
        }catch(e){console.error(e); this.displayError(e.message);}
    },
    async submitReview(reviewData){
        try{
            const user=auth.getCurrentUser(), token=auth.getToken();
            if(!token) throw new Error('Authentication required');
            const res=await auth.request(REVIEW_API,{method:'POST', headers:{'Authorization':`Bearer ${token}`,'username':user.userName}, body:JSON.stringify(reviewData)});
            if(!res.ok){const d=await res.json(); throw new Error(d.message||'Submit failed');}
            const data=await res.json(); this.showSuccess('Review saved');
            document.getElementById('reviewForm')?.reset();
            document.getElementById('rating')&&(document.getElementById('rating').value='0'); this.updateStarRating(0);
            this.loadReviews(); return data;
        }catch(e){console.error(e); throw e;}
    },
    displayReviews(reviewsData){
        const list=document.getElementById('reviewsList');
        if(!list)return;
        if(!reviewsData||reviewsData.length===0){list.innerHTML=`<div class="text-center py-5"><h5>No reviews yet</h5></div>`; return;}
        list.innerHTML=reviewsData.map(r=>`<div class="card review-card"><h5>${r.title||'Review'}</h5><p>${r.comment||r.review||''}</p><small>${r.reviewerName||r.userName||'Anonymous'} | ${this.formatDate(r.createdAt||r.date)}</small></div>`).join('');
    },
    displayError(msg){const list=document.getElementById('reviewsList'); if(list) list.innerHTML=`<div class="alert alert-danger">${msg}</div>`;},
    showSuccess(msg){const a=document.createElement('div'); a.className='alert alert-success alert-dismissible fade show position-fixed'; a.style.cssText='top:20px;right:20px;z-index:1055;min-width:300px'; a.innerHTML=`${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`; document.body.appendChild(a); setTimeout(()=>a.parentNode&&a.remove(),3000);},
    generateStars(r){let s=''; for(let i=0;i<Math.floor(r);i++) s+='<i class="fas fa-star"></i>'; if(r%1!==0)s+='<i class="fas fa-star-half-alt"></i>'; for(let i=0;i<5-Math.ceil(r);i++) s+='<i class="far fa-star"></i>'; return s;},
    formatDate(d){if(!d)return'Unknown Date'; try{return new Date(d).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});}catch(e){return'Unknown Date';}},
    updateStarRating(r){document.querySelectorAll('.star-rating .star').forEach((s,i)=>i<r?s.classList.add('active'):s.classList.remove('active'));}
};

document.addEventListener('DOMContentLoaded',()=>{
    if(!auth.isAuthenticated()){window.location.href='/html/signin.html'; return;}
    reviews.loadReviews();
    const stars=document.querySelectorAll('.star-rating .star'), ratingInput=document.getElementById('rating');
    stars.forEach(s=>{s.addEventListener('click',()=>{const r=parseInt(s.getAttribute('data-rating')); ratingInput.value=r; reviews.updateStarRating(r);}); s.addEventListener('mouseover',()=>{reviews.updateStarRating(parseInt(s.getAttribute('data-rating')));});});
    document.getElementById('starRating')?.addEventListener('mouseleave',()=>{reviews.updateStarRating(parseInt(ratingInput.value)||0);});
    document.getElementById('reviewForm')?.addEventListener('submit', async e=>{
        e.preventDefault();
        const formData=new FormData(e.target);
        const rating=parseInt(document.getElementById('rating')?.value||'0');
        if(rating===0){alert('Select rating'); return;}
        const reviewData={
            destination: formData.get('destination')||'',
            title: formData.get('title')||'',
            comment: formData.get('comment')||'',
            rating: rating
        };
        const btn=e.target.querySelector('button[type="submit"]');
        if(btn){const t=btn.innerHTML; btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin me-2"></i> Submitting...';
            try{await reviews.submitReview(reviewData);}catch(e){alert('Failed to submit review');}finally{btn.disabled=false; btn.innerHTML=t;}
        }
    });
});

window.reviews = reviews;
window.itineraryService = itineraryService;
window.saveUserItinerary = saveUserItinerary;
