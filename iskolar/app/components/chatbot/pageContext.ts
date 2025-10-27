/**
 * Utility to extract relevant page context for ISKAi chatbot
 * This allows the AI to answer questions based on what's visible on the current page
 */

export function extractPageContext(): string {
  try {
    const context: string[] = [];
    
    // Get the current page title/heading
    const mainHeading = document.querySelector('h1, h2.text-2xl, h2.text-3xl');
    if (mainHeading) {
      context.push(`Current Page: ${mainHeading.textContent?.trim()}`);
    }
    
    // Extract user profile information if visible
    const profileElements = document.querySelectorAll('[class*="profile"], [class*="user-info"]');
    profileElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length < 200) {
        context.push(text);
      }
    });
    
    // Extract visible form labels and values
    const formFields = document.querySelectorAll('label, input[value], select option[selected]');
    formFields.forEach(field => {
      const text = field.textContent?.trim();
      const value = (field as HTMLInputElement).value;
      if (text && text.length < 100) {
        if (value && value.length < 100) {
          context.push(`${text}: ${value}`);
        } else {
          context.push(text);
        }
      }
    });
    
    // Extract application status if visible
    const statusElements = document.querySelectorAll('[class*="status"], [class*="application"]');
    statusElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length < 200 && (text.includes('Status') || text.includes('Application'))) {
        context.push(text);
      }
    });
    
    // Extract announcements if on announcements page
    const announcementElements = document.querySelectorAll('[class*="announcement"]');
    if (announcementElements.length > 0) {
      context.push('Announcements visible on page:');
      announcementElements.forEach((el, index) => {
        if (index < 5) { // Limit to first 5 announcements
          const title = el.querySelector('h3, h4, strong')?.textContent?.trim();
          if (title) {
            context.push(`- ${title}`);
          }
        }
      });
    }
    
    // Extract any visible user name
    const nameElements = document.querySelectorAll('[class*="name"], [data-user-name]');
    nameElements.forEach(el => {
      const name = el.textContent?.trim() || el.getAttribute('data-user-name');
      if (name && name.length > 3 && name.length < 100 && !name.includes('@')) {
        context.push(`User Name: ${name}`);
      }
    });
    
    // If no context found, return a generic message
    if (context.length === 0) {
      return 'No specific page context available';
    }
    
    return context.join('\n');
  } catch (error) {
    console.error('Error extracting page context:', error);
    return 'Unable to extract page context';
  }
}
