/* ================================================
   VILANA PREMIUM ANIMATIONS SCRIPT
   ================================================ */

(function() {
  'use strict';

  // ============================================
  // 1. PRELOADER
  // ============================================
  const preloader = document.getElementById('preloader');
  
  if (preloader) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        preloader.classList.add('fade-out');
        // Remove from DOM after animation
        setTimeout(() => {
          preloader.remove();
        }, 500);
      }, 800); // Show preloader for at least 800ms
    });
  }

  // ============================================
  // 2. CURSOR TRAIL EFFECT (Golden Sparkles)
  // ============================================
  const canvas = document.getElementById('cursorCanvas');
  
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouseX = 0;
    let mouseY = 0;
    
    // Set canvas size
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Particle class
    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.life = 1;
        this.decay = Math.random() * 0.02 + 0.01;
        this.color = this.getGoldenColor();
      }
      
      getGoldenColor() {
        const colors = [
          'rgba(212, 175, 55, ', // Gold
          'rgba(255, 215, 0, ',  // Bright gold
          'rgba(184, 134, 11, ', // Dark gold
          'rgba(255, 223, 128, ' // Light gold
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        this.size *= 0.96;
      }
      
      draw() {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color + this.life + ')';
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color + '0.5)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    
    // Track mouse movement
    let lastEmitTime = 0;
    const emitInterval = 30; // Emit particles every 30ms
    
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      const currentTime = Date.now();
      if (currentTime - lastEmitTime > emitInterval) {
        // Create multiple particles
        for (let i = 0; i < 3; i++) {
          particles.push(new Particle(
            mouseX + (Math.random() - 0.5) * 10,
            mouseY + (Math.random() - 0.5) * 10
          ));
        }
        lastEmitTime = currentTime;
      }
    });
    
    // Animation loop
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        
        // Remove dead particles
        if (particles[i].life <= 0 || particles[i].size < 0.1) {
          particles.splice(i, 1);
        }
      }
      
      requestAnimationFrame(animate);
    }
    
    animate();
    
    // Disable on mobile to save performance
    if (window.innerWidth < 768) {
      canvas.style.display = 'none';
    }
  }

  // ============================================
  // 3. SCROLL REVEAL ANIMATIONS
  // ============================================
  const revealElements = document.querySelectorAll('.reveal');
  
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Optional: stop observing after reveal
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });
  
  revealElements.forEach(element => {
    revealObserver.observe(element);
  });

  // ============================================
  // 4. SMOOTH PAGE TRANSITIONS
  // ============================================
  const links = document.querySelectorAll('a:not([target="_blank"]):not([href^="#"]):not([href^="tel:"]):not([href^="mailto:"])');
  
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      
      // Only apply to internal links
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        e.preventDefault();
        
        // Add transition class
        document.body.classList.add('page-transition');
        
        // Navigate after animation
        setTimeout(() => {
          window.location.href = href;
        }, 300);
      }
    });
  });

  // ============================================
  // 5. ENHANCED BUTTON RIPPLE EFFECT
  // ============================================
  const buttons = document.querySelectorAll('.btn-premium');
  
  buttons.forEach(button => {
    button.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ripple = document.createElement('span');
      ripple.style.position = 'absolute';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.style.width = '0';
      ripple.style.height = '0';
      ripple.style.borderRadius = '50%';
      ripple.style.background = 'rgba(255, 255, 255, 0.5)';
      ripple.style.transform = 'translate(-50%, -50%)';
      ripple.style.pointerEvents = 'none';
      ripple.style.animation = 'ripple 0.6s ease-out';
      
      this.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });
  
  // Add ripple animation to CSS dynamically
  if (!document.querySelector('#ripple-animation')) {
    const style = document.createElement('style');
    style.id = 'ripple-animation';
    style.textContent = `
      @keyframes ripple {
        to {
          width: 300px;
          height: 300px;
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ============================================
  // 6. PARALLAX EFFECT FOR HERO
  // ============================================
  const heroMedia = document.querySelector('.hero-media');
  
  if (heroMedia && window.innerWidth > 768) {
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const rate = scrolled * 0.5;
      heroMedia.style.transform = `translate3d(0, ${rate}px, 0)`;
    });
  }

  // ============================================
  // 7. SMOOTH SCROLL FOR ANCHOR LINKS
  // ============================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      
      if (href !== '#' && href !== '#main') {
        e.preventDefault();
        
        const target = document.querySelector(href);
        if (target) {
          const headerOffset = 80;
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // ============================================
  // 8. HEADER SCROLL EFFECT
  // ============================================
  const header = document.querySelector('header');
  let lastScroll = 0;
  
  if (header) {
    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;
      
      if (currentScroll > 100) {
        header.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        header.style.background = 'rgba(255, 255, 255, 0.98)';
      } else {
        header.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
        header.style.background = '#ffffff';
      }
      
      lastScroll = currentScroll;
    });
  }

  // ============================================
  // 9. IMAGE LAZY LOAD ENHANCEMENT
  // ============================================
  const images = document.querySelectorAll('img[loading="lazy"]');
  
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.5s ease';
        
        img.addEventListener('load', () => {
          img.style.opacity = '1';
        });
        
        imageObserver.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));

  // ============================================
  // 10. PERFORMANCE: Disable animations on low-end devices
  // ============================================
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    document.body.style.setProperty('--animation-duration', '0.1s');
  }

  // ============================================
  // 11. CONSOLE SIGNATURE
  // ============================================
  console.log(
    '%c✨ Vilana Event & Catering ✨',
    'color: #D4AF37; font-size: 20px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);'
  );
  console.log(
    '%cPremium Animations Loaded',
    'color: #666; font-size: 12px;'
  );

})();
