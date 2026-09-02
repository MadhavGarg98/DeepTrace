import type { CompanyNode } from '../../api/types';

/**
 * Calculates a deterministic layout for nodes by grouping them by tier.
 * Tiers are rendered as horizontal rows.
 */
export function calculateTierLayout(nodes: CompanyNode[], width: number = 800) {
  const tiers: Record<number, CompanyNode[]> = {};
  
  nodes.forEach(node => {
    if (!tiers[node.tier]) {
      tiers[node.tier] = [];
    }
    tiers[node.tier].push(node);
  });

  const positions: Record<string, { x: number; y: number }> = {};
  
  const maxNodesPerRow = 7;
  const ySpacingTier = 140; // distance between different tiers
  const ySpacingSubRow = 80; // distance between wrapped sub-rows within a tier
  const startY = 50;
  
  let currentY = startY;

  // Render from tier 0 to max tier top-to-bottom
  const maxTier = Math.max(...Object.keys(tiers).map(Number));

  for (let tier = 0; tier <= maxTier; tier++) {
    const tierNodes = tiers[tier] || [];
    
    // Split tier into multiple sub-rows if it exceeds maxNodesPerRow
    const rows: CompanyNode[][] = [];
    for (let i = 0; i < tierNodes.length; i += maxNodesPerRow) {
      rows.push(tierNodes.slice(i, i + maxNodesPerRow));
    }
    
    rows.forEach((row, rowIndex) => {
      const count = row.length;
      // Distribute evenly across width
      const xSpacing = width / (count + 1);
      
      row.forEach((node, i) => {
        positions[node.id] = {
          x: xSpacing * (i + 1),
          y: currentY
        };
      });
      
      // Advance Y if there are more sub-rows in this tier
      if (rowIndex < rows.length - 1) {
        currentY += ySpacingSubRow;
      }
    });
    
    // Advance Y to the next tier's starting position
    currentY += ySpacingTier;
  }

  return positions;
}
