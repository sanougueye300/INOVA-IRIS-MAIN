# 👨‍💻 Developer Quick Start - INOVA-IRIS Stripe Integration

## Installation Rapide (5 minutes)

```bash
# 1. Installer dépendances
npm install

# 2. Configuration locale
cp .env.example .env.local

# 3. Configurer Stripe en .env.local
VITE_STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY_HERE

# 4. Démarrer dev server
npm run dev

# 5. Ouvrir http://localhost:5173/
# Naviguer à la section #offres pour voir les cartes
```

---

## Architecture Code

### Frontend Structure
```
src/
├── routes/
│   └── index.tsx               # Page d'accueil + section offres
│       ├── Hero section
│       ├── Offres section ← REDESIGNÉE
│       ├── Services section
│       ├── FAQ section
│       └── Checkout modal (existant)
│
├── components/
│   └── StripeCheckout.tsx      # Nouveau! Modal Stripe payment
│
└── lib/
    ├── stripe-utils.ts         # Nouveau! Utilitaires Stripe
    ├── stripe-config.ts        # Nouveau! Configuration Stripe
    └── offers.ts               # Catalogue offres (existant)
```

### Key Files Modified
```
✏️ src/routes/index.tsx
   └─ Section #offres redesignée (lignes 480-750)
   └─ Imports mis à jour avec Clock, ChevronDown

✏️ package.json
   └─ @stripe/js ajouté
   └─ @stripe/react-stripe-js ajouté
```

### New Files Created
```
✨ src/components/StripeCheckout.tsx (350 lines)
   └─ Modal checkout complet
   └─ CardElement integration
   └─ Multi-step form

✨ src/lib/stripe-utils.ts (100 lines)
   └─ Fonctions création/vérification session
   └─ Formatage currency
   └─ Validation email/phone

✨ src/lib/stripe-config.ts (100 lines)
   └─ Configuration centralisée
   └─ Env variables
   └─ Validation config
```

---

## Components Overview

### 1. Pricing Cards (index.tsx)
```tsx
// Rendu dynamique de 3 cartes pour les offres actives
{offers.filter(o => o.isActive).map((plan) => (
  <div
    onClick={() => handleSelectPlan(plan)}
    className={`relative group rounded-2xl...`}
  >
    {/* Popular badge pour Terranga */}
    {isPopular && <div className="absolute -top-12 -right-12 ...">}

    {/* Card content */}
    <h3>{plan.name}</h3>
    <div className={`mb-8 p-5 rounded-xl ${colors.highlight}`}>
      {/* Pricing section */}
    </div>

    {/* SLA Metrics */}
    <div className="space-y-3 mb-8 pb-8 border-b...">
      {/* MTTD, MTTR, Agents EDR */}
    </div>

    {/* Features list */}
    <ul className="space-y-3">
      {plan.features.map((feat) => <li>{feat}</li>)}
    </ul>

    {/* CTA Button */}
    <Button onClick={(e) => {
      e.stopPropagation();
      handleSelectPlan(plan);
    }}>
  </div>
))}
```

### 2. StripeCheckout Component
```tsx
<StripeCheckout
  isOpen={showCheckoutModal}
  onClose={() => setShowCheckoutModal(false)}
  offer={selectedOffer}
  onPaymentSuccess={(sessionId) => {
    // Handle success
    navigate({ to: "/dashboard" });
  }}
/>
```

### 3. Comparison Table
```tsx
<details className="group cursor-pointer">
  <summary>
    <ChevronDown className="group-open:rotate-180" />
    Voir la comparaison détaillée
  </summary>

  <div className="bg-white rounded-2xl border overflow-x-auto">
    <table>
      <thead>
        <tr>
          <th>Fonctionnalité</th>
          {offers.map(plan => <th>{plan.name}</th>)}
        </tr>
      </thead>
      <tbody>
        {/* Features comparison rows */}
      </tbody>
    </table>
  </div>
</details>
```

---

## Styling & Colors

### Theme Colors (Tailwind)
```ts
const themeColors = {
  orange: {
    gradient: "from-orange-50 to-orange-50/30",
    border: "border-orange-200",
    accent: "text-orange-600",
    button: "bg-orange-600 hover:bg-orange-700"
  },
  blue: {
    gradient: "from-blue-50 to-blue-50/30",
    border: "border-blue-200",
    accent: "text-blue-600",
    button: "bg-blue-600 hover:bg-blue-700"
  },
  gold: {
    gradient: "from-amber-50 to-amber-50/30",
    border: "border-amber-200",
    accent: "text-amber-600",
    button: "bg-amber-600 hover:bg-amber-700"
  }
};
```

### Animations
```css
/* Smooth transitions */
transition: all duration-500;
hover:shadow-xl;
hover:-translate-y-1;

/* Glow effects */
bg-orange-500/5 blur-3xl opacity-0 group-hover:opacity-100;

/* Scale on popular card */
lg:scale-105;

/* Button feedback */
hover:scale-[1.01];
```

---

## Usage Examples

### Sélectionner une Offre
```tsx
const handleSelectPlan = (plan: Offer) => {
  setSelectedPlanId(plan.id);
  setValidatingPlanId(plan.id);
  // Simulate validation...
  setValidatedPlanId(plan.id);
  toast.success(`Offre "${plan.name}" validée!`);
};
```

### Ouvrir Checkout
```tsx
const openCheckout = (plan: Offer) => {
  setCheckoutPlan(plan);
  setCheckoutStep("account");
  setShowCheckoutModal(true);
};
```

### Appeler API Stripe (Futur)
```tsx
const { sessionId } = await createCheckoutSession({
  email: email,
  amount: offer.value,
  currency: offer.currency,
  offerId: offer.id,
  offerName: offer.name,
  companyName: companyName,
  fullName: fullName,
  phone: phone
});

// Redirect to Stripe Checkout
window.location.href = sessionUrl;
```

---

## Testing Locally

### Test Cards (Stripe Test Mode)
```
✓ Successful:  4242 4242 4242 4242
✗ Declined:    4000 0000 0000 0002
⚠️ Auth:       4000 0027 6000 3184
💥 Error:      5555 5555 5555 4444

Expiry: Any future date (12/25)
CVC: Any 3 digits (123)
```

### Test Flow
```bash
1. npm run dev
2. Accéder http://localhost:5173/#offres
3. Cliquer sur une offre
4. Cliquer "Procéder au paiement"
5. Remplir infos:
   - Nom: Test User
   - Email: test@example.com
   - Téléphone: +221 77 123 45 67
6. Sélectionner "Carte Bancaire"
7. Entrer 4242 4242 4242 4242
8. Expiry: 12/25, CVC: 123
9. Soumettre
10. Vérifier console pour logs
```

---

## Environment Variables

### Required (.env.local)
```env
# Stripe (public key - peut être exposée)
VITE_STRIPE_PUBLIC_KEY=pk_test_XXXXX

# Optional
VITE_API_BASE_URL=http://localhost:3000
VITE_RESEND_API_KEY=re_XXXXX
```

### Backend (.env - serveur seulement)
```env
# Stripe (secret key - JAMAIS exposer)
STRIPE_SECRET_KEY=sk_test_XXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXX

# Database
SUPABASE_URL=https://XXXXX
SUPABASE_KEY=XXXXX

# App
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

---

## Common Issues & Fixes

### Issue: "Stripe is not defined"
```
Solution: Vérifier VITE_STRIPE_PUBLIC_KEY est configurée
          Vérifier loadStripe() est appelé
```

### Issue: "CardElement not working"
```
Solution: Vérifier <Elements> wrapper autour du composant
          Vérifier Stripe provider est configuré
```

### Issue: "CORS errors"
```
Solution: Configurer CORS en backend
          Ajouter headers: Access-Control-Allow-Origin
```

### Issue: "Payment modal doesn't appear"
```
Solution: Vérifier showCheckoutModal state
          Vérifier checkoutPlan n'est pas null
          Vérifier Dialog composant ui/dialog est disponible
```

### Issue: "Animations pas smooth"
```
Solution: Utiliser transform/opacity (GPU accelerated)
          Éviter animations de layout (width, height)
          Vérifier will-change si besoin
```

---

## Git Workflow

```bash
# Créer feature branch
git checkout -b feat/stripe-integration

# Faire changes
# Committer
git add .
git commit -m "feat: redesign pricing section with Stripe integration"

# Tester avant push
npm run build
npm run lint

# Push et créer PR
git push origin feat/stripe-integration
```

---

## Performance Tips

1. **Lazy Load Stripe**
   - Charger CardElement seulement au step 3 du modal
   - Util: `React.lazy()` pour composant Stripe

2. **Optimize Images**
   - Icons from Lucide sont inline SVGs (light)
   - Backgrounds dégradés en CSS (pas images)

3. **Bundle Size**
   - @stripe/js ~100KB (gzipped ~30KB)
   - @stripe/react-stripe-js ~50KB (gzipped ~15KB)
   - Acceptable pour application SaaS

4. **Animations**
   - Utiliser `duration-300` pour interactions rapides
   - `duration-500` pour transitions de page
   - Limiter simultanées animations

---

## Documentation Links

- 📚 [Stripe React Docs](https://stripe.com/docs/stripe-js/react)
- 🔧 [Stripe Dashboard](https://dashboard.stripe.com)
- 💳 [CardElement Docs](https://stripe.com/docs/stripe-js/elements/card-element)
- 🪝 [Webhooks Guide](https://stripe.com/docs/webhooks)

---

## Support Contacts

- **Stripe Support**: support@stripe.com
- **Project Issues**: GitHub Issues
- **Slack Channel**: #stripe-integration (if applicable)

---

## Checklist Before Production

- [ ] Pas de console.logs en production
- [ ] Environment variables configurées correctement
- [ ] Tests unitaires passent: `npm test`
- [ ] Build OK: `npm run build`
- [ ] Lint OK: `npm run lint`
- [ ] No console errors in dev tools
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Stripe live keys configurées
- [ ] Backend endpoints implémentés
- [ ] Email service configuré
- [ ] Database migrations appliquées
- [ ] Security review completed
- [ ] Performance benchmarks OK

---

**Ready to develop!** 🚀
