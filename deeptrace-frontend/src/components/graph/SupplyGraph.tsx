import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import type { Core } from 'cytoscape';
import { api } from '../../api/client';
import type { GraphDataResponse } from '../../api/types';
import { graphStyle } from './graphStyle';
import { calculateTierLayout } from './graphLayout';
import { useStore } from '../../state/store';
import type { RiskChain } from '../../api/types';

export const SupplyGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [graphData, setGraphData] = useState<GraphDataResponse | null>(null);
  const [risks, setRisks] = useState<RiskChain[]>([]);
  
  const { 
    setSelectedNodeId, 
    activeRiskId, 
    disruptedNodeId 
  } = useStore();

  const [activeRisk, setActiveRisk] = useState<RiskChain | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    // Load full graph and risks for sizing
    api.getGraph().then(data => setGraphData(data)).catch(console.error);
    api.getRisks().then(data => setRisks(data.risks)).catch(console.error);
  }, []);

  useEffect(() => {
    // If activeRiskId changes, fetch it to get paths
    if (activeRiskId) {
       api.getRisks().then(res => {
         const risk = res.risks.find(r => r.id === activeRiskId);
         setActiveRisk(risk || null);
       });
    } else {
       setActiveRisk(null);
    }
  }, [activeRiskId]);

  useEffect(() => {
    if (!containerRef.current || !graphData || risks.length === 0) return;

    if (!cyRef.current) {
      const cy = cytoscape({
        container: containerRef.current,
        style: graphStyle,
        wheelSensitivity: 0.2,
      });

      cy.on('tap', 'node', (evt) => {
        const node = evt.target;
        setSelectedNodeId(node.id());
      });

      cy.on('tap', (evt) => {
        if (evt.target === cy) {
          setSelectedNodeId(null);
        }
      });

      cy.on('mouseover', 'edge', (evt) => {
        const edge = evt.target;
        const eData = edge.data();
        const fromNode = cy.getElementById(eData.source);
        const toNode = cy.getElementById(eData.target);
        
        if (fromNode && toNode && eData.suppliesWhat) {
          const text = `${fromNode.data('label')} supplies ${eData.suppliesWhat} to ${toNode.data('label')}`;
          const popper = evt.renderedPosition; // relative to container
          
          if (popper) {
            setHoveredEdge({ text, x: popper.x, y: popper.y });
          }
        }
      });

      cy.on('mouseout', 'edge', () => {
        setHoveredEdge(null);
      });

      cyRef.current = cy;
    }

    const cy = cyRef.current;
    cy.elements().remove();

    // Prepare layout positions
    // Width roughly based on container
    const width = containerRef.current.clientWidth || 800;
    const positions = calculateTierLayout(graphData.nodes, width);

    // Add Nodes
    graphData.nodes.forEach(node => {
      // Find max risk score for this node
      let maxScore = 0;
      risks.forEach(r => {
        if (r.bottleneck_node_id === node.id && r.score > maxScore) {
          maxScore = r.score;
        }
      });
      
      let size = node.tier === 0 ? 48 : 32;
      if (maxScore > 0) {
        // Scale from 32 up to 48 based on score
        size = 32 + (maxScore / 100) * 16;
      }

      cy.add({
        group: 'nodes',
        data: { 
          ...node,
          id: node.id, 
          label: node.name,
          tier: node.tier,
          size: size
        },
        position: positions[node.id] || { x: 0, y: 0 }
      });
    });

    // Add Edges
    // Backend returns Supplier -> Buyer
    // For visualization, we want arrows pointing Supplier -> Buyer.
    graphData.edges.forEach(edge => {
      const fromNode = graphData.nodes.find(n => n.id === edge.from_id);
      cy.add({
        group: 'edges',
        data: {
          id: `${edge.from_id}-${edge.to_id}`,
          source: edge.from_id,
          target: edge.to_id,
          opacity: Math.max(0.2, edge.confidence), // ensure min visibility
          evidence: edge.evidence,
          confidence: edge.confidence,
          sourceType: edge.source,
          suppliesWhat: fromNode?.supplies_what || fromNode?.industry?.toLowerCase() || 'supplies'
        }
      });
    });

    cy.fit(undefined, 40);
  }, [graphData]);

  // Handle active risk styling
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    cy.elements().removeClass('isRisk dimmed');

    if (activeRisk) {
      // Collect all nodes in path
      const pathNodes = new Set<string>();
      activeRisk.chain_nodes.forEach(n => pathNodes.add(n.id));
      activeRisk.affected_tier1_suppliers.forEach(n => pathNodes.add(n));

      const pathEdges = new Set<string>();
      
      // Edges between chain nodes
      for (let i = 0; i < activeRisk.chain_nodes.length - 1; i++) {
        const supplier = activeRisk.chain_nodes[i+1].id;
        const buyer = activeRisk.chain_nodes[i].id;
        pathEdges.add(`${supplier}-${buyer}`);
        pathEdges.add(`${buyer}-${supplier}`);
      }
      
      // Edges to affected tier 1s
      const topOfChain = activeRisk.chain_nodes[0].id;
      activeRisk.affected_tier1_suppliers.forEach(t1 => {
        pathEdges.add(`${topOfChain}-${t1}`);
        pathEdges.add(`${t1}-${topOfChain}`);
      });

      cy.nodes().forEach(n => {
        if (pathNodes.has(n.id())) n.addClass('isRisk');
        // else n.addClass('dimmed');
      });

      cy.edges().forEach(e => {
        if (pathEdges.has(e.id())) e.addClass('isRisk');
        // else e.addClass('dimmed');
      });
    }
  }, [activeRisk]);

  // Handle disruption styling and animation
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    
    cy.nodes().removeClass('isDisrupted');

    if (disruptedNodeId) {
      const node = cy.getElementById(disruptedNodeId);
      if (node.length) {
        node.addClass('isDisrupted');
      }
    }
  }, [disruptedNodeId]);

  return (
    <div className="relative w-full h-full bg-[var(--color-bg)]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button 
          className="w-8 h-8 flex items-center justify-center bg-white border border-[var(--color-border)] rounded hover:bg-gray-50 text-gray-600 shadow-sm"
          onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)}
        >
          +
        </button>
        <button 
          className="w-8 h-8 flex items-center justify-center bg-white border border-[var(--color-border)] rounded hover:bg-gray-50 text-gray-600 shadow-sm"
          onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
        >
          -
        </button>
        <button 
          className="w-8 h-8 flex items-center justify-center bg-white border border-[var(--color-border)] rounded hover:bg-gray-50 text-gray-600 shadow-sm text-xs font-medium"
          onClick={() => cyRef.current?.fit(undefined, 40)}
        >
          Fit
        </button>
      </div>

      {hoveredEdge && (
        <div 
          className="absolute z-20 pointer-events-none slide-down px-2.5 py-1 text-[11px] font-medium tracking-wide bg-gray-900 text-white rounded shadow-lg flex items-center gap-1.5"
          style={{ top: hoveredEdge.y - 30, left: hoveredEdge.x }}
        >
          {hoveredEdge.text}
        </div>
      )}

      {/* Permanent Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white border border-[var(--color-border)] rounded-md shadow-sm p-3 text-xs text-[var(--color-text-secondary)] space-y-2 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-neutral-node)]" style={{ backgroundColor: '#B4B2A9' }}></div>
          <span>Buyer</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-tier1)]" style={{ backgroundColor: '#378ADD' }}></div>
          <span>Direct supplier</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-risk)]" style={{ backgroundColor: '#D85A30' }}></div>
          <span>Hidden risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-danger)]" style={{ backgroundColor: '#E24B4A' }}></div>
          <span>Disrupted</span>
        </div>
      </div>
    </div>
  );
};
