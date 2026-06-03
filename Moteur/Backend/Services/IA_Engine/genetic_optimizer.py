import random
import copy
from typing import List, Tuple, Dict, Any
from .optimizer import Piece, GuillotineOptimizer

class GeneticOptimizer:
    """
    A Hybrid Genetic Algorithm wrapper for the Guillotine cutting optimizer.
    It evolves the sequence (permutation) of pieces to minimize waste.
    """
    def __init__(
        self,
        population_size: int = 40,
        generations: int = 25,
        mutation_rate: float = 0.15,
        elitism_count: int = 4
    ):
        self.population_size = population_size
        self.generations = generations
        self.mutation_rate = mutation_rate
        self.elitism_count = elitism_count
        self.optimizer = GuillotineOptimizer()

    def _create_initial_population(self, pieces: List[Piece]) -> List[List[Piece]]:
        population = []
        
        # 1. Original order
        population.append(list(pieces))
        
        # 2. Area descending (Classic heuristic)
        population.append(sorted(pieces, key=lambda p: p.width * p.height, reverse=True))
        
        # 3. Max dimension descending
        population.append(sorted(pieces, key=lambda p: max(p.width, p.height), reverse=True))
        
        # 4. Perimeter descending (often better for irregular aspect ratios)
        population.append(sorted(pieces, key=lambda p: 2*(p.width + p.height), reverse=True))
        
        # 5. Aspect ratio: squarer pieces first (closer to 1:1 ratio)
        population.append(sorted(pieces, key=lambda p: abs(1 - p.width/p.height) if p.height > 0 else float('inf')))
        
        # 6. Fill the rest with random permutations
        while len(population) < self.population_size:
            individual = list(pieces)
            random.shuffle(individual)
            population.append(individual)
            
        return population[:self.population_size]

    def _crossover(self, parent1: List[Piece], parent2: List[Piece]) -> List[Piece]:
        """Ordered Crossover (OX1) specifically for permutations."""
        size = len(parent1)
        if size < 2:
            return list(parent1)
            
        start, end = sorted(random.sample(range(size), 2))
        
        # Child starts with a segment from parent1
        child = [None] * size
        child[start:end] = parent1[start:end]
        
        # Fill remaining spots with parent2 elements in order
        parent1_ids = {id(p) for p in child if p is not None}
        p2_ptr = 0
        
        for i in range(size):
            if child[i] is None:
                while p2_ptr < size and id(parent2[p2_ptr]) in parent1_ids:
                    p2_ptr += 1
                if p2_ptr < size:
                    child[i] = parent2[p2_ptr]
                    parent1_ids.add(id(parent2[p2_ptr]))
                    p2_ptr += 1
        
        # Safety check for any remaining Nones (shouldn't happen with valid permutations)
        if None in child:
            remaining = [p for p in parent2 if id(p) not in parent1_ids]
            rem_ptr = 0
            for i in range(size):
                if child[i] is None and rem_ptr < len(remaining):
                    child[i] = remaining[rem_ptr]
                    rem_ptr += 1
                    
        return child

    def _mutate(self, individual: List[Piece]) -> List[Piece]:
        """Swap mutation."""
        if len(individual) < 2:
            return individual
            
        if random.random() < self.mutation_rate:
            idx1, idx2 = random.sample(range(len(individual)), 2)
            individual[idx1], individual[idx2] = individual[idx2], individual[idx1]
        return individual

    def run(self, pieces: List[Piece], stock_panels: List[Tuple[int, float, float, bool, int]]) -> Dict:
        """Runs the genetic evolution to find the best piece sequence."""
        if not pieces:
            return self.optimizer.optimize([], stock_panels)
            
        if len(pieces) == 1:
            return self.optimizer.optimize(pieces, stock_panels)

        population = self._create_initial_population(pieces)
        
        best_result = None
        best_waste = float('inf')
        
        # Track if we've seen an exceptionally good result (e.g. < 2% waste) to stop early
        EARLY_STOP_THRESHOLD = 2.0 

        for gen in range(self.generations):
            fitness_scores = []
            
            for individual in population:
                # Prepare pieces for evaluation (reset placements)
                # We work on copies to avoid side effects during evolution
                eval_pieces = []
                for p in individual:
                    p_copy = copy.copy(p)
                    p_copy.placements = []
                    p_copy.offcuts = []
                    eval_pieces.append(p_copy)
                
                result = self.optimizer.optimize(eval_pieces, stock_panels)
                waste = result['waste_percentage']
                fitness_scores.append(waste)
                
                if waste < best_waste:
                    best_waste = waste
                    best_result = result
                    
            if best_waste <= EARLY_STOP_THRESHOLD:
                break

            # Sort population by fitness
            indexed_fitness = list(enumerate(fitness_scores))
            indexed_fitness.sort(key=lambda x: x[1])
            
            # Selection & Breeding
            sorted_pop = [population[i] for i, _ in indexed_fitness]
            new_population = sorted_pop[:self.elitism_count]
            
            # Fill the rest with children
            while len(new_population) < self.population_size:
                # Tournament selection from top 50%
                pool_size = max(2, len(sorted_pop) // 2)
                p1 = random.choice(sorted_pop[:pool_size])
                p2 = random.choice(sorted_pop[:pool_size])
                
                child = self._crossover(p1, p2)
                child = self._mutate(child)
                new_population.append(child)
                
            population = new_population

        return best_result
