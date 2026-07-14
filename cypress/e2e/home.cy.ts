describe('Goal Kashmir Homepage', () => {
  it('successfully loads', () => {
    cy.visit('/')
    
    // Verify that the main brand title is present
    cy.contains('Goal Kashmir', { matchCase: false }).should('be.visible')
    
    // Verify navigation elements
    cy.get('nav').should('be.visible')
  })
})
