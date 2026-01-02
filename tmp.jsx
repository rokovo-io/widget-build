// widget.js - WITH INLINE PRODUCT CAROUSEL (FIXED POSITIONING)
(function() {
  'use strict';

  const WIDGET_SCRIPT = document.currentScript;

  // Inject React dependencies
  function loadDependencies() {
    return new Promise((resolve) => {
      let loaded = 0;
      const checkLoaded = () => {
        loaded++;
        if (loaded === 2) resolve();
      };

      if (!window.React) {
        const reactScript = document.createElement('script');
        reactScript.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
        reactScript.crossOrigin = 'anonymous';
        reactScript.onload = checkLoaded;
        document.head.appendChild(reactScript);
      } else {
        checkLoaded();
      }

      if (!window.ReactDOM) {
        const reactDomScript = document.createElement('script');
        reactDomScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
        reactDomScript.crossOrigin = 'anonymous';
        reactDomScript.onload = checkLoaded;
        document.head.appendChild(reactDomScript);
      } else {
        checkLoaded();
      }
    });
  }

  // Product Parser
  function parseProducts(message) {
    const products = [];
    const lines = message.split('\n');
    let currentProduct = null;

    console.log('🔍 Parsing message for products...');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      const pattern1 = line.match(/^(\d+)\.\s+(.+?)\s+-\s+(.+?),\s+\$?([\d,]+\.?\d*(?:\s+to\s+\$?[\d,]+\.?\d*)?)/i);
      const pattern2 = line.match(/^(\d+)\.\s+(.+?)\s+-\s+(.+?)\s+-\s+Price:\s+\$?([\d,]+\.?\d*(?:\s*-\s*\$?[\d,]+\.?\d*)?)/i);
      const pattern3 = line.match(/^(\d+)\.\s+(.+?)\s+\(([^)]+)\)\s+-\s+Price:\s+\$?([\d,]+\.?\d*)/i);

      if (pattern1 || pattern2 || pattern3) {
        if (currentProduct && (currentProduct.link || currentProduct.image)) {
          products.push(currentProduct);
        }

        const match = pattern1 || pattern2 || pattern3;
        currentProduct = {
          name: match[2].trim(),
          description: match[3].trim(),
          price: match[4].trim().replace(/\s*(?:to|-)\s*\$?[\d,]+\.?\d*/, ''),
          link: null,
          image: null
        };
        console.log('✅ Found product:', currentProduct.name);

        const inlineLink = line.match(/\[View Product\]\((https?:\/\/[^\)]+)\)/i);
        if (inlineLink) currentProduct.link = inlineLink[1].trim();

        const inlineImage = line.match(/!\[(?:Image|[^\]]*)\]\((https?:\/\/[^\)]+)\)/);
        if (inlineImage) currentProduct.image = inlineImage[1].trim();

        continue;
      }

      if (currentProduct) {
        const linkMatch1 = line.match(/^(?:-\s*)?Link:\s*(https?:\/\/\S+)/i);
        const linkMatch2 = line.match(/\[View Product\]\((https?:\/\/[^\)]+)\)/i);
        const linkMatch3 = line.match(/^(https?:\/\/(?:www\.)?[^\s]+\.com\/products\/[^\s]+)/i);

        if (linkMatch1) currentProduct.link = linkMatch1[1].trim();
        else if (linkMatch2) currentProduct.link = linkMatch2[1].trim();
        else if (linkMatch3 && !currentProduct.link) currentProduct.link = linkMatch3[1].trim();

        const imageMatch1 = line.match(/(?:-\s*)?Image:\s*!\[(?:[^\]]*)\]\((https?:\/\/[^\)]+)\)/i);
        const imageMatch2 = line.match(/!\[(?:Image|Link|[^\]]*)\]\((https?:\/\/[^\)]+)\)/);
        const imageMatch3 = line.match(/^(https?:\/\/cdn\.shopify\.com\/[^\s]+)/i);

        if (imageMatch1) currentProduct.image = imageMatch1[1].trim();
        else if (imageMatch2 && !currentProduct.image) currentProduct.image = imageMatch2[1].trim();
        else if (imageMatch3 && !currentProduct.image) currentProduct.image = imageMatch3[1].trim();
      }
    }

    if (currentProduct && (currentProduct.link || currentProduct.image)) {
      products.push(currentProduct);
    }

    console.log(`📦 Total products parsed: ${products.length}`);
    return products;
  }

  // IMPROVED: Split message and insert carousel placeholder
  function parseMessageWithProducts(message) {
    const lines = message.split('\n');
    let beforeProducts = [];
    let afterProducts = [];
    let inProductSection = false;
    let productSectionEnded = false;
    let firstProductIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if this is a product line
      const isProductLine = line.match(/^(\d+)\.\s+(.+?)\s+-\s+.+?,\s+\$?[\d,]/i) ||
                           line.match(/^(\d+)\.\s+(.+?)\s+-\s+.+?\s+-\s+Price:/i);

      // Check if this is product metadata
      const isProductMetadata = line.match(/^(?:-\s*)?(?:Link:|Image:)/i) ||
                               line.match(/^\[View Product\]/i) ||
                               line.match(/^https?:\/\/(?:www\.)?(?:tentree\.com|cdn\.shopify\.com)/i) ||
                               line.match(/^!\[/i);

      if (isProductLine && !inProductSection) {
        // First product found
        inProductSection = true;
        firstProductIndex = i;
      } else if (inProductSection && !productSectionEnded) {
        if (!isProductLine && !isProductMetadata && line.length > 0 && !line.match(/^Available/i)) {
          // Product section ended
          productSectionEnded = true;
          afterProducts.push(lines[i]);
        }
      } else if (!inProductSection) {
        // Before products
        beforeProducts.push(lines[i]);
      } else if (productSectionEnded) {
        // After products
        afterProducts.push(lines[i]);
      }
    }

    // If we found products, insert placeholder
    if (firstProductIndex !== -1) {
      return {
        before: beforeProducts.join('\n').trim(),
        hasProducts: true,
        after: afterProducts.join('\n').trim()
      };
    }

    // No products found
    return {
      before: message,
      hasProducts: false,
      after: ''
    };
  }

  // Inject custom styles
  function injectStyles() {
    if (document.getElementById('rokovo-widget-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'rokovo-widget-styles';
    styles.textContent = `
      #rokovo-widget-root {
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
        color: #09090b;
      }

      #rokovo-widget-root * {
        box-sizing: border-box;
      }

      #rokovo-widget-root .rk-text-muted {
        color: #71717a;
      }

      #rokovo-widget-root .rk-text-subtle {
        color: #a1a1aa;
      }

      #rokovo-widget-root .rk-line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      #rokovo-widget-root .rk-scrollbar::-webkit-scrollbar {
        width: 8px;
      }

      #rokovo-widget-root .rk-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }

      #rokovo-widget-root .rk-scrollbar::-webkit-scrollbar-thumb {
        background: #e4e4e7;
        border-radius: 999px;
      }

      #rokovo-widget-root .rk-card {
        background: #ffffff;
        border: 1px solid #e4e4e7;
        border-radius: 12px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      }

      #rokovo-widget-root .rk-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 20px;
        padding: 0 8px;
        border-radius: 999px;
        border: 1px solid #e4e4e7;
        background: #f4f4f5;
        color: #52525b;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0.02em;
      }

      #rokovo-widget-root .rk-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 36px;
        padding: 0 14px;
        border-radius: 8px;
        border: 1px solid #e4e4e7;
        background: #ffffff;
        color: #18181b;
        font-size: 14px;
        font-weight: 500;
        line-height: 1;
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s, transform 0.1s, box-shadow 0.2s;
      }

      #rokovo-widget-root .rk-button:hover:not(:disabled) {
        background: #f4f4f5;
      }

      #rokovo-widget-root .rk-button:active:not(:disabled) {
        transform: translateY(1px);
      }

      #rokovo-widget-root .rk-button:focus-visible {
        outline: none;
        box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #18181b;
      }

      #rokovo-widget-root .rk-button-primary {
        border-color: #18181b;
        background: #18181b;
        color: #fafafa;
      }

      #rokovo-widget-root .rk-button-primary:hover:not(:disabled) {
        background: #0f0f11;
      }

      #rokovo-widget-root .rk-button-ghost {
        border-color: transparent;
        background: transparent;
      }

      #rokovo-widget-root .rk-button-ghost:hover:not(:disabled) {
        background: #f4f4f5;
      }

      #rokovo-widget-root .rk-button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      #rokovo-widget-root .rk-input {
        width: 100%;
        height: 40px;
        border-radius: 10px;
        border: 1px solid #e4e4e7;
        background: #ffffff;
        padding: 0 12px;
        font-size: 14px;
        color: #18181b;
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      #rokovo-widget-root .rk-input::placeholder {
        color: #a1a1aa;
      }

      #rokovo-widget-root .rk-input:focus {
        outline: none;
        border-color: #18181b;
        box-shadow: 0 0 0 3px rgba(24, 24, 27, 0.12);
      }

      #rokovo-widget-root .rk-fab {
        width: 56px;
        height: 56px;
        border-radius: 999px;
        box-shadow: 0 12px 32px rgba(24, 24, 27, 0.25);
      }

      #rokovo-widget-root .rk-panel {
        background: #ffffff;
        border: 1px solid #e4e4e7;
        border-radius: 20px;
        box-shadow: 0 24px 64px rgba(24, 24, 27, 0.2);
        overflow: hidden;
      }

      #rokovo-widget-root .rk-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 18px;
        border-bottom: 1px solid #f4f4f5;
        background: #fafafa;
      }

      #rokovo-widget-root .rk-avatar {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: #18181b;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fafafa;
      }

      #rokovo-widget-root .rk-status-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #22c55e;
      }

      #rokovo-widget-root .rk-messages {
        padding: 18px;
        overflow-y: auto;
      }

      #rokovo-widget-root .rk-bubble {
        padding: 10px 12px;
        border-radius: 16px;
        border: 1px solid #e4e4e7;
        background: #f4f4f5;
        color: #18181b;
        font-size: 14px;
        line-height: 1.6;
      }

      #rokovo-widget-root .rk-bubble-user {
        border-color: #18181b;
        background: #18181b;
        color: #fafafa;
      }

      #rokovo-widget-root .rk-bubble-wrap {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
      }

      #rokovo-widget-root .rk-message-column {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      #rokovo-widget-root .rk-footer {
        border-top: 1px solid #f4f4f5;
        padding: 10px 14px;
        text-align: center;
        background: #fafafa;
      }

      #rokovo-widget-root .rk-input-row {
        display: flex;
        gap: 10px;
        padding: 14px 18px 16px;
        border-top: 1px solid #f4f4f5;
        background: #ffffff;
      }

      #rokovo-widget-root .rk-product-card {
        overflow: hidden;
      }

      #rokovo-widget-root .rk-product-image {
        position: relative;
        width: 100%;
        padding-bottom: 100%;
        background: #f4f4f5;
      }

      #rokovo-widget-root .rk-product-image img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      #rokovo-widget-root .rk-product-body {
        padding: 14px 16px 16px;
      }

      #rokovo-widget-root .rk-product-title {
        font-weight: 600;
        font-size: 15px;
        margin: 0 0 6px;
      }

      #rokovo-widget-root .rk-product-desc {
        font-size: 13px;
        color: #71717a;
        margin: 0 0 12px;
      }

      #rokovo-widget-root .rk-product-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid #f4f4f5;
        padding-top: 12px;
      }

      #rokovo-widget-root .rk-product-price {
        font-size: 18px;
        font-weight: 600;
        color: #18181b;
      }

      /* Carousel Styles */
      #rokovo-widget-root .rk-carousel {
        position: relative;
        margin: 16px 0;
        overflow: hidden;
        border-radius: 12px;
      }

      #rokovo-widget-root .rk-carousel-track {
        display: flex;
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: transform;
      }

      #rokovo-widget-root .rk-carousel-slide {
        flex-shrink: 0;
        width: 100%;
        padding: 0 4px;
      }

      #rokovo-widget-root .rk-carousel-nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 32px;
        height: 32px;
        border-radius: 999px;
        background: #ffffff;
        border: 1px solid #e4e4e7;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 6px 16px rgba(24, 24, 27, 0.15);
        transition: transform 0.2s, opacity 0.2s;
        z-index: 2;
      }

      #rokovo-widget-root .rk-carousel-nav:hover {
        transform: translateY(-50%) scale(1.05);
      }

      #rokovo-widget-root .rk-carousel-nav.prev {
        left: 8px;
      }

      #rokovo-widget-root .rk-carousel-nav.next {
        right: 8px;
      }

      #rokovo-widget-root .rk-carousel-dots {
        display: flex;
        justify-content: center;
        gap: 6px;
        margin-top: 10px;
      }

      #rokovo-widget-root .rk-carousel-dot {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: #d4d4d8;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
      }

      #rokovo-widget-root .rk-carousel-dot.active {
        width: 18px;
        border-radius: 999px;
        background: #18181b;
      }

      #rokovo-widget-root .rk-loader {
        width: 44px;
        height: 44px;
        border-radius: 999px;
        border: 3px solid #e4e4e7;
        border-top-color: #18181b;
        border-right-color: #18181b;
        animation: rk-spin 0.8s linear infinite;
      }

      @keyframes rk-spin {
        to {
          transform: rotate(360deg);
        }
      }

      @keyframes rokovo-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
        40% { transform: translateY(-6px); opacity: 1; }
      }

      #rokovo-widget-root .animate-typing span {
        display: inline-block;
        animation: rokovo-bounce 1.4s ease-in-out infinite;
      }

      #rokovo-widget-root .animate-typing span:nth-child(1) {
        animation-delay: 0s;
      }

      #rokovo-widget-root .animate-typing span:nth-child(2) {
        animation-delay: 0.2s;
      }

      #rokovo-widget-root .animate-typing span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes rokovo-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      #rokovo-widget-root .animate-pulse-slow {
        animation: rokovo-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      @keyframes rokovo-fade-in {
        from { opacity: 0; transform: scale(0.95) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }

      #rokovo-widget-root .animate-fade-in {
        animation: rokovo-fade-in 0.2s ease-out;
      }

      @keyframes rokovo-slide-up {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      #rokovo-widget-root .animate-slide-up {
        animation: rokovo-slide-up 0.3s ease-out;
      }

      body.rokovo-chat-open {
        overflow: hidden;
      }

      @media (max-width: 640px) {
        #rokovo-widget-root .rk-mobile-fullscreen {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
          border-radius: 0 !important;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  // Widget Component
  function RokovoWidget({ config }) {
    const React = window.React;
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [sessionId, setSessionId] = useState(null);
    const [error, setError] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 640);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
      if (isOpen && isMobile) {
        document.body.classList.add('rokovo-chat-open');
      } else {
        document.body.classList.remove('rokovo-chat-open');
      }
      return () => document.body.classList.remove('rokovo-chat-open');
    }, [isOpen, isMobile]);

    const scrollToBottom = useCallback(() => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, []);

    useEffect(() => {
      scrollToBottom();
    }, [messages, isTyping, scrollToBottom]);

    const initSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${config.apiBaseUrl}/transport/widget`, {
          method: 'POST',
          headers: {
            'api-key': config.publishableKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ externalUserId: `external_${Date.now()}` })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        setSessionId(data.data.sessionId);

        setMessages([{
          id: '1',
          content: `Hello! I'm ${config.agentName} from ${config.businessName}. How can I help you today?`,
          role: 'assistant'
        }]);

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize session:', error);
        setError('Failed to connect. Please try again.');
        setIsLoading(false);
      }
    };

    useEffect(() => {
      if (isOpen && messages.length === 0) {
        initSession();
      }
    }, [isOpen]);

    const sendMessage = async () => {
      if (!input.trim() || isTyping || !sessionId) return;

      const userMessage = {
        id: Date.now().toString(),
        content: input.trim(),
        role: 'user'
      };

      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsTyping(true);

      try {
        const response = await fetch(`${config.apiBaseUrl}/transport/widget`, {
          method: 'PATCH',
          headers: {
            'api-key': config.publishableKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId,
            content: userMessage.content
          })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: data.data.response.content,
          role: 'assistant'
        }]);
      } catch (error) {
        console.error('Failed to send message:', error);
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: "I'm sorry, I'm having trouble responding right now. Please try again.",
          role: 'assistant'
        }]);
      } finally {
        setIsTyping(false);
        inputRef.current?.focus();
      }
    };

    const toggleChat = () => {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => inputRef.current?.focus(), 300);
      }
    };

    // Product Card Component
    const ProductCard = React.memo(({ product }) => (
      React.createElement('a', {
        href: product.link,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'rk-card rk-product-card animate-fade-in',
        style: { textDecoration: 'none', color: 'inherit' }
      },
        product.image && React.createElement('div', {
          className: 'rk-product-image'
        },
          React.createElement('img', {
            src: product.image,
            alt: product.name,
            loading: 'lazy',
            onError: (e) => {
              e.target.style.display = 'none';
              const parent = e.target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#a1a1aa;">
                    <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                `;
              }
            }
          })
        ),
        React.createElement('div', { className: 'rk-product-body' },
          React.createElement('h4', { className: 'rk-product-title rk-line-clamp-2' }, product.name),
          product.description && React.createElement('p', {
            className: 'rk-product-desc rk-line-clamp-2'
          }, product.description),
          React.createElement('div', { className: 'rk-product-meta' },
            React.createElement('div', null,
              React.createElement('div', { className: 'rk-text-subtle', style: { fontSize: '12px' } }, 'Price'),
              React.createElement('div', { className: 'rk-product-price' }, `$${product.price}`)
            ),
            React.createElement('span', { className: 'rk-button rk-button-ghost', style: { height: '32px' } },
              React.createElement('span', null, 'View Details'),
              React.createElement('svg', {
                width: '14',
                height: '14',
                fill: 'none',
                stroke: 'currentColor',
                viewBox: '0 0 24 24',
                strokeWidth: '2',
                strokeLinecap: 'round',
                strokeLinejoin: 'round'
              }, React.createElement('path', { d: 'M5 12h14M12 5l7 7-7 7' }))
            )
          )
        )
      )
    ));

    // Product Carousel Component
    const ProductCarousel = React.memo(({ products }) => {
      const [currentIndex, setCurrentIndex] = useState(0);
      const [touchStart, setTouchStart] = useState(null);
      const [touchEnd, setTouchEnd] = useState(null);
      const carouselRef = useRef(null);

      const minSwipeDistance = 50;

      const nextSlide = useCallback(() => {
        setCurrentIndex(prev => (prev + 1) % products.length);
      }, [products.length]);

      const prevSlide = useCallback(() => {
        setCurrentIndex(prev => (prev - 1 + products.length) % products.length);
      }, [products.length]);

      const goToSlide = useCallback((index) => {
        setCurrentIndex(index);
      }, []);

      const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
      };

      const onTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
      };

      const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) nextSlide();
        if (isRightSwipe) prevSlide();
      };

      if (products.length === 0) return null;

      return React.createElement('div', {
        className: 'rk-carousel',
        onTouchStart,
        onTouchMove,
        onTouchEnd
      },
        // Carousel Track
        React.createElement('div', {
          ref: carouselRef,
          className: 'rk-carousel-track',
          style: {
            transform: `translateX(-${currentIndex * 100}%)`
          }
        },
          products.map((product, idx) =>
            React.createElement('div', {
              key: idx,
              className: 'rk-carousel-slide'
            },
              React.createElement(ProductCard, { product })
            )
          )
        ),

        // Navigation Buttons
        products.length > 1 && React.createElement(React.Fragment, null,
          React.createElement('button', {
            onClick: prevSlide,
            className: 'rk-carousel-nav prev',
            'aria-label': 'Previous product',
            style: {
              opacity: currentIndex === 0 ? 0.5 : 1,
              cursor: currentIndex === 0 ? 'default' : 'pointer'
            }
          },
            React.createElement('svg', {
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24',
              strokeWidth: '2.5',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            },
              React.createElement('path', { d: 'M15 18l-6-6 6-6' })
            )
          ),
          React.createElement('button', {
            onClick: nextSlide,
            className: 'rk-carousel-nav next',
            'aria-label': 'Next product',
            style: {
              opacity: currentIndex === products.length - 1 ? 0.5 : 1,
              cursor: currentIndex === products.length - 1 ? 'default' : 'pointer'
            }
          },
            React.createElement('svg', {
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24',
              strokeWidth: '2.5',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            },
              React.createElement('path', { d: 'M9 18l6-6-6-6' })
            )
          )
        ),

        // Dots Navigation
        products.length > 1 && React.createElement('div', {
          className: 'rk-carousel-dots'
        },
          products.map((_, idx) =>
            React.createElement('button', {
              key: idx,
              onClick: () => goToSlide(idx),
              className: `rk-carousel-dot ${idx === currentIndex ? 'active' : ''}`,
              'aria-label': `Go to product ${idx + 1}`
            })
          )
        ),

        // Product Counter
        products.length > 1 && React.createElement('div', {
          className: 'rk-text-subtle',
          style: { textAlign: 'center', marginTop: '6px', fontSize: '12px' }
        },
          React.createElement('span', null, `${currentIndex + 1} of ${products.length} products`)
        )
      );
    });

    // FIXED: Message Component with proper inline rendering
    const Message = React.memo(({ message, index }) => {
      const products = useMemo(() => {
        return message.role === 'assistant' ? parseProducts(message.content) : [];
      }, [message.content, message.role]);

      const parsedContent = useMemo(() => {
        if (products.length === 0) {
          return { before: message.content, hasProducts: false, after: '' };
        }
        return parseMessageWithProducts(message.content);
      }, [message.content, products.length]);

      return React.createElement('div', {
        className: 'rk-bubble-wrap animate-slide-up',
        style: {
          justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
          alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
          animationDelay: `${index * 0.05}s`
        }
      },
        message.role === 'assistant' && React.createElement('div', {
          className: 'rk-avatar'
        },
          React.createElement('svg', {
            width: '20',
            height: '20',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          },
            React.createElement('path', { d: 'M12 8V4H8' }),
            React.createElement('rect', { width: '16', height: '12', x: '4', y: '8', rx: '2' }),
            React.createElement('path', { d: 'M2 14h2M20 14h2M15 13v2M9 13v2' })
          )
        ),
        React.createElement('div', {
          className: 'rk-message-column',
          style: { maxWidth: message.role === 'user' ? '80%' : '90%' }
        },
          React.createElement('div', {
            className: `rk-bubble ${message.role === 'user' ? 'rk-bubble-user' : ''}`
          },
            // Text before products
            parsedContent.before && React.createElement('div', {
              style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
            }, parsedContent.before),

            // Products carousel inline
            parsedContent.hasProducts && products.length > 0 && React.createElement(ProductCarousel, {
              products
            }),

            // Text after products
            parsedContent.after && React.createElement('div', {
              style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' }
            }, parsedContent.after)
          )
        )
      );
    });

    // Typing Indicator
    const TypingIndicator = React.memo(({ agentName }) => (
      React.createElement('div', {
        className: 'rk-bubble-wrap animate-fade-in',
        style: { alignItems: 'flex-start' }
      },
        React.createElement('div', {
          className: 'rk-avatar'
        },
          React.createElement('svg', {
            width: '20',
            height: '20',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round'
          },
            React.createElement('path', { d: 'M12 8V4H8' }),
            React.createElement('rect', { width: '16', height: '12', x: '4', y: '8', rx: '2' })
          )
        ),
        React.createElement('div', {
          className: 'rk-bubble',
          style: { display: 'flex', alignItems: 'center', gap: '10px' }
        },
          React.createElement('span', {
            className: 'rk-text-muted',
            style: { fontSize: '13px' }
          }, `${agentName} is typing`),
          React.createElement('div', {
            className: 'animate-typing',
            style: { display: 'flex', gap: '4px' }
          },
            React.createElement('span', {
              style: { width: '6px', height: '6px', borderRadius: '999px', background: '#18181b' }
            }),
            React.createElement('span', {
              style: { width: '6px', height: '6px', borderRadius: '999px', background: '#18181b' }
            }),
            React.createElement('span', {
              style: { width: '6px', height: '6px', borderRadius: '999px', background: '#18181b' }
            })
          )
        )
      )
    ));

    const messagesList = useMemo(() => (
      messages.map((msg, idx) =>
        React.createElement(Message, {
          key: msg.id,
          message: msg,
          index: idx,
        })
      )
    ), [messages]);

    return React.createElement('div', {
      id: 'rokovo-widget-root',
      style: {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 999999
      }
    },
      // Toggle Button
      React.createElement('button', {
        onClick: toggleChat,
        className: 'rk-button rk-button-primary rk-fab',
        'aria-label': isOpen ? 'Close chat' : 'Open chat',
        'aria-expanded': isOpen
      },
        React.createElement('div', {
          style: { position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
          React.createElement('div', {
            style: {
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s',
              transform: isOpen ? 'rotate(90deg) scale(0)' : 'rotate(0) scale(1)',
              opacity: isOpen ? 0 : 1
            }
          },
            React.createElement('svg', {
              width: '24',
              height: '24',
              fill: 'currentColor',
              viewBox: '0 0 24 24'
            },
              React.createElement('path', {
                d: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z'
              })
            )
          ),
          React.createElement('div', {
            style: {
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s',
              transform: isOpen ? 'rotate(0) scale(1)' : 'rotate(-90deg) scale(0)',
              opacity: isOpen ? 1 : 0
            }
          },
            React.createElement('svg', {
              width: '24',
              height: '24',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24',
              strokeWidth: '2.5',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            },
              React.createElement('path', { d: 'M18 6L6 18M6 6l12 12' })
            )
          )
        )
      ),

      // Chat Window
      isOpen && React.createElement('div', {
        className: `rk-panel animate-slide-up ${isMobile ? 'rk-mobile-fullscreen' : ''}`,
        style: isMobile ? {
          borderRadius: '0'
        } : {
          width: '420px',
          height: '680px',
          maxWidth: 'calc(100vw - 3rem)',
          maxHeight: 'calc(100vh - 140px)'
        }
      },
        // Header
        React.createElement('div', {
          className: 'rk-header'
        },
          React.createElement('div', { className: 'rk-avatar' },
            React.createElement('svg', {
              width: '20',
              height: '20',
              fill: 'currentColor',
              viewBox: '0 0 24 24'
            },
              React.createElement('path', {
                d: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z'
              })
            )
          ),
          React.createElement('div', { style: { flex: 1, minWidth: 0 } },
            React.createElement('h3', {
              style: { fontSize: '15px', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
            }, config.agentName),
            React.createElement('div', {
              style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }
            },
              React.createElement('div', { className: 'rk-status-dot animate-pulse-slow' }),
              React.createElement('span', {
                className: 'rk-text-muted',
                style: { fontSize: '12px' }
              }, 'Online')
            )
          ),
          !isMobile && React.createElement('button', {
            onClick: toggleChat,
            className: 'rk-button rk-button-ghost',
            'aria-label': 'Close chat'
          },
            React.createElement('svg', {
              width: '18',
              height: '18',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24',
              strokeWidth: '2',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            },
              React.createElement('path', { d: 'M18 6L6 18M6 6l12 12' })
            )
          )
        ),

        // Messages
        React.createElement('div', {
          className: 'rk-messages rk-scrollbar',
          style: { minHeight: 0 }
        },
          isLoading ?
            React.createElement('div', {
              style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }
            },
              React.createElement('div', { className: 'rk-loader' }),
              React.createElement('p', { className: 'rk-text-muted', style: { fontSize: '13px', fontWeight: 500 } }, 'Connecting...')
            )
          : error ?
            React.createElement('div', {
              style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '0 24px', gap: '12px' }
            },
              React.createElement('div', { className: 'rk-badge', style: { height: '36px', padding: '0 12px', background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' } },
                React.createElement('svg', {
                  width: '18',
                  height: '18',
                  fill: 'none',
                  stroke: 'currentColor',
                  viewBox: '0 0 24 24',
                  strokeWidth: '2'
                },
                  React.createElement('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                  })
                )
              ),
              React.createElement('p', {
                style: { color: '#b91c1c', fontSize: '13px', fontWeight: 500, margin: 0 }
              }, error),
              React.createElement('button', {
                onClick: initSession,
                className: 'rk-button rk-button-primary'
              }, 'Try Again')
            )
          :
            React.createElement('div', null,
              messagesList,
              isTyping && React.createElement(TypingIndicator, {
                agentName: config.agentName
              }),
              React.createElement('div', { ref: messagesEndRef })
            )
        ),

        // Input
        React.createElement('div', {
          className: 'rk-input-row'
        },
          React.createElement('input', {
            ref: inputRef,
            type: 'text',
            value: input,
            onChange: (e) => setInput(e.target.value),
            onKeyPress: (e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            },
            placeholder: 'Type your message...',
            disabled: isLoading || !sessionId || error,
            className: 'rk-input'
          }),
          React.createElement('button', {
            onClick: sendMessage,
            disabled: !input.trim() || isTyping || isLoading || !sessionId || error,
            className: 'rk-button rk-button-primary',
            style: { minWidth: '54px' }
          },
            React.createElement('svg', {
              width: '18',
              height: '18',
              fill: 'none',
              stroke: 'currentColor',
              viewBox: '0 0 24 24',
              strokeWidth: '2',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            },
              React.createElement('path', { d: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' })
            )
          )
        ),

        // Footer
        React.createElement('div', {
          className: 'rk-footer'
        },
          React.createElement('a', {
            href: 'https://rokovo.io',
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'rk-text-muted',
            style: { textDecoration: 'none', fontSize: '12px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }
          },
            'Powered by ',
            React.createElement('span', {
              style: { fontWeight: 600, color: '#18181b' }
            }, 'Rokovo')
          )
        )
      )
    );
  }

  // Initialize widget
  async function init() {
    const script = WIDGET_SCRIPT || document.querySelector('script[data-publishable-key]');

    if (!script) {
      console.error('Rokovo Widget: Script tag not found');
      return;
    }

    const config = {
      publishableKey: script.getAttribute('data-publishable-key'),
      businessName: script.getAttribute('data-business-name') || 'Your Business',
      agentName: script.getAttribute('data-agent-name') || 'AI Assistant',
      primaryColor: script.getAttribute('data-primary-color') || '#FF4800',
      apiBaseUrl: script.getAttribute('data-api-base-url') || 'https://api.rokovo.io'
    };

    if (!config.publishableKey) {
      console.error('Rokovo Widget: publishableKey is required');
      return;
    }

    console.log('🚀 Rokovo Widget: Initializing...', config);

    await loadDependencies();
    injectStyles();

    await new Promise(resolve => setTimeout(resolve, 300));

    const container = document.createElement('div');
    container.id = `rokovo-widget-${config.publishableKey}`;
    document.body.appendChild(container);

    const root = window.ReactDOM.createRoot(container);
    root.render(window.React.createElement(RokovoWidget, { config }));

    console.log('✅ Rokovo Widget: Loaded successfully!');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.RokovoWidget = { init };
})();
