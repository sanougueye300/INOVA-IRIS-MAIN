# Configuration Stripe pour INOVA-IRIS

## Vue d'ensemble

La plateforme INOVA-IRIS a été mise à jour pour supporter Stripe comme processeur de paiement sécurisé. Cela vous permet de traiter les paiements de manière professionnelle et conforme.

## Installation des dépendances

Les dépendances Stripe ont été ajoutées au `package.json` :

```bash
npm install @stripe/js @stripe/react-stripe-js
```

## Configuration

### 1. Clés Stripe

Vous devez configurer les clés publiques Stripe dans vos variables d'environnement.

Créez un fichier `.env.local` à la racine du projet :

```env
# Clé publique Stripe
VITE_STRIPE_PUBLIC_KEY=pk_test_VOTRE_CLE_PUBLIQUE_STRIPE

# Produits Stripe (optionnel si utilisant l'API)
VITE_STRIPE_PRODUCT_INOVA=prod_XXXXX
VITE_STRIPE_PRODUCT_TERRANGA=prod_YYYYY  
VITE_STRIPE_PRODUCT_GAINDE=prod_ZZZZZ
```

### 2. Obtenir vos clés Stripe

1. Créez un compte Stripe : https://dashboard.stripe.com
2. Accédez à **Developers** → **API Keys**
3. Copiez votre **Publishable key** (clé publique)
4. Copiez votre **Secret key** (pour le backend uniquement)

## Architecture de Paiement

### Architecture Frontend

La page d'accueil (index.tsx) affiche les trois formules d'abonnement avec :
- ✅ Design professionnel et attrayant
- ✅ Sélection de formule avec animations
- ✅ Comparaison détaillée des offres
- ✅ Processus de checkout intégré
- ✅ Support des paiements par carte avec Stripe

### Architecture Backend

Vous devrez implémenter deux endpoints API :

#### 1. `POST /api/create-checkout-session`

Crée une session Stripe Checkout.

```typescript
// Demande
{
  email: string;
  amount: number;
  currency: string;
  offerId: string;
  offerName: string;
  companyName: string;
  fullName: string;
  phone: string;
}

// Réponse
{
  sessionId: string;
  url?: string; // Pour redirection
}
```

#### 2. `GET /api/verify-payment/{sessionId}`

Vérifie le statut d'un paiement.

```typescript
// Réponse
{
  paid: boolean;
  paymentIntentId: string;
  email: string;
  amount: number;
}
```

#### 3. `POST /api/charge` (optionnel pour tokens)

Pour les paiements par token (non recommandé en production).

```typescript
// Demande
{
  token: string;
  amount: number;
  email: string;
  name: string;
  company: string;
  offerId: string;
  phone: string;
}

// Réponse
{
  success: boolean;
  sessionId: string;
  error?: string;
}
```

## Composants Disponibles

### StripeCheckout Component

Composant modal complèt pour les paiements Stripe.

```typescript
import { StripeCheckout } from "@/components/StripeCheckout";

<StripeCheckout
  isOpen={showPaymentModal}
  onClose={() => setShowPaymentModal(false)}
  offer={selectedOffer}
  onPaymentSuccess={(sessionId) => {
    // Rediriger ou confirmer
  }}
/>
```

### Utilitaires Stripe

```typescript
import {
  createCheckoutSession,
  verifyPayment,
  formatCurrency,
  isValidEmail,
  isValidPhone
} from "@/lib/stripe-utils";
```

## Flux de Paiement

1. **Sélection d'offre**
   - L'utilisateur clique sur une formule
   - La carte se met en surbrillance
   - Le bouton "Procéder au paiement" apparaît

2. **Informations de client**
   - Nom complet
   - Email
   - Téléphone
   - Entreprise (optionnel)

3. **Sélection du moyen de paiement**
   - Carte bancaire via Stripe (recommandé)
   - Wave Sénégal (système legacy)
   - Orange Money (système legacy)

4. **Traitement du paiement**
   - Pour Stripe : redirection vers Stripe Checkout
   - Pour Wave/OM : vérification du code OTP

5. **Confirmation**
   - Email de bienvenue
   - Génération automatique du mot de passe
   - Accès au dashboard

## Sécurité

- ✅ Tous les tokens de paiement transitent par Stripe
- ✅ Pas de stockage des numéros de carte
- ✅ Conformité PCI DSS garantie
- ✅ Chiffrement TLS en transit
- ✅ Validation email et téléphone côté client et serveur

## Variables d'Environnement Requises

```env
# Stripe (obligatoire pour les paiements par carte)
VITE_STRIPE_PUBLIC_KEY=pk_test_51234567890

# API Backend
VITE_API_BASE_URL=https://votre-api.com

# Email (pour notifications)
VITE_RESEND_API_KEY=your_resend_key
```

## Gestion des Erreurs

Les erreurs de paiement sont gérées gracieusement :
- Messages d'erreur clairs en français
- Possibilité de réessayer
- Support client disponible

## Testing

### Mode Test Stripe

Utilisez ces numéros de test :
- **Carte valide** : 4242 4242 4242 4242
- **Carte refusée** : 4000 0000 0000 0002
- **Expiration** : 12/25
- **CVC** : 123 (n'importe quel 3 chiffres)

### Webhooks (Production)

En production, configurez les webhooks Stripe :
- `payment_intent.succeeded`
- `charge.failed`
- `invoice.payment_succeeded`

## Déploiement

### Variables d'Environnement Production

```env
VITE_STRIPE_PUBLIC_KEY=pk_live_votre_cle_production
STRIPE_SECRET_KEY=sk_live_votre_secret_production
VITE_API_BASE_URL=https://api.inova-iris.com
```

### Endpoints Stripe à Implémenter

```bash
# Backend route example (Node.js + Express)
POST /api/create-checkout-session
POST /api/webhooks/stripe  # Webhook Stripe
GET /api/verify-payment/:sessionId
```

## Support

Pour plus d'informations :
- 📚 [Documentation Stripe React](https://stripe.com/docs/stripe-js/react)
- 🔧 [Dashboard Stripe](https://dashboard.stripe.com)
- 💬 Support INOVA : support@inova-iris.com
