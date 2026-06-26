import { Container } from '@chinooz/ui-web'

const footerLinks = [
  {
    title: 'Shop',
    links: ['New Arrivals', 'Best Sellers', 'Deals', 'Categories'],
  },
  {
    title: 'Help',
    links: ['Customer Service', 'Track Order', 'Returns', 'Contact Us'],
  },
  {
    title: 'About',
    links: ['About Chinooz', 'Careers', 'Press', 'Blog'],
  },
]

export function Footer() {
  return (
    <footer className="hidden md:block border-t border-border bg-white mt-auto">
      <Container className="py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold text-primary mb-3">Chinooz</h3>
            <p className="text-sm text-text-muted">Nepal&apos;s marketplace</p>
          </div>
          {footerLinks.map(group => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-text mb-3">{group.title}</h4>
              <ul className="flex flex-col gap-2">
                {group.links.map(link => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-text-muted hover:text-primary transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t border-border-light text-xs text-text-tertiary text-center">
          &copy; {new Date().getFullYear()} Chinooz. All rights reserved.
        </div>
      </Container>
    </footer>
  )
}
