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
  const ySpacing = 140; // vertical distance between tiers
  const startY = 50;

  // Render from tier 0 to max tier top-to-bottom
  const maxTier = Math.max(...Object.keys(tiers).map(Number));

  for (let tier = 0; tier <= maxTier; tier++) {
    const tierNodes = tiers[tier] || [];
    const count = tierNodes.length;
    
    // Distribute evenly across width
    const xSpacing = width / (count + 1);
    
    tierNodes.forEach((node, i) => {
      positions[node.id] = {
        x: xSpacing * (i + 1),
        y: startY + tier * ySpacing
      };
    });
  }

  return positions;
}
