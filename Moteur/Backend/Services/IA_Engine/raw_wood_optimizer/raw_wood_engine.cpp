#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <vector>
#include <algorithm>
#include <cmath>

namespace py = pybind11;

const float EPSILON = 1e-4f;

struct Rect {
    float x;
    float y;
    float w;
    float h;
};

struct Piece {
    int id;
    float width;
    float height;
};

struct Board {
    int id;
    float minx;
    float miny;
    float maxx;
    float maxy;
    std::vector<Rect> defects;
};

struct PlacementResult {
    int piece_id;
    int board_id;
    float x;
    float y;
    float w;
    float h;
    bool rotated;
};

bool check_collision_fast(float x, float y, float w, float h, const std::vector<Rect>& placed, const std::vector<Rect>& defects, float kerf) {
    float min_x = x;
    float min_y = y;
    float max_x = x + w;
    float max_y = y + h;

    for (const auto& p : placed) {
        float p_min_x = p.x;
        float p_min_y = p.y;
        float p_max_x = p.x + p.w;
        float p_max_y = p.y + p.h;

        bool overlap = !(max_x <= p_min_x - kerf + EPSILON || min_x >= p_max_x + kerf - EPSILON ||
                         max_y <= p_min_y - kerf + EPSILON || min_y >= p_max_y + kerf - EPSILON);
        if (overlap) return true;
    }

    for (const auto& d : defects) {
        float d_min_x = d.x;
        float d_min_y = d.y;
        float d_max_x = d.x + d.w;
        float d_max_y = d.y + d.h;

        bool overlap = !(max_x <= d_min_x + EPSILON || min_x >= d_max_x - EPSILON ||
                         max_y <= d_min_y + EPSILON || min_y >= d_max_y - EPSILON);
        if (overlap) return true;
    }

    return false;
}

std::vector<PlacementResult> find_best_position(
    std::vector<Piece> pieces, 
    std::vector<Board> boards, 
    float kerf, 
    bool allow_transverse,
    float resolution
) {
    std::vector<PlacementResult> results;
    std::vector<Piece> remaining_pieces = pieces;

    for (const auto& board : boards) {
        std::vector<Rect> placed;
        float board_w = board.maxx - board.minx;
        float board_h = board.maxy - board.miny;
        
        std::vector<Piece> next_remaining;
        
        for (const auto& piece : remaining_pieces) {
            float p_long = std::max(piece.width, piece.height);
            float p_short = std::min(piece.width, piece.height);
            
            std::vector<std::pair<float, float>> orientations; // {w, h}
            
            if (allow_transverse) {
                orientations.push_back({p_long, p_short});
                if (piece.width != piece.height) {
                    orientations.push_back({p_short, p_long});
                }
            } else {
                // Default: longest side on X
                float default_w = p_long;
                float default_h = p_short;
                
                // Exclude orientation if it fundamentally does not fit the board
                if (default_w <= board_w + EPSILON && default_h <= board_h + EPSILON) {
                    orientations.push_back({default_w, default_h});
                } else if (default_h <= board_w + EPSILON && default_w <= board_h + EPSILON) {
                    orientations.push_back({default_h, default_w});
                }
            }
            
            bool placed_piece = false;
            
            for (const auto& ori : orientations) {
                float w = ori.first;
                float h = ori.second;
                
                if (w > board_w + EPSILON || h > board_h + EPSILON) continue;
                
                float best_x = -1, best_y = -1;
                
                // Sweep logic
                for (float x = board.minx; x <= board.maxx - w + EPSILON; x += resolution) {
                    for (float y = board.miny; y <= board.maxy - h + EPSILON; y += resolution) {
                        if (!check_collision_fast(x, y, w, h, placed, board.defects, kerf)) {
                            best_x = x;
                            best_y = y;
                            placed_piece = true;
                            break;
                        }
                    }
                    if (placed_piece) break;
                }
                
                if (placed_piece) {
                    PlacementResult pr;
                    pr.piece_id = piece.id;
                    pr.board_id = board.id;
                    pr.x = best_x;
                    pr.y = best_y;
                    pr.w = w;
                    pr.h = h;
                    pr.rotated = (std::abs(w - piece.width) > EPSILON); 
                    results.push_back(pr);
                    
                    placed.push_back({best_x, best_y, w, h});
                    break;
                }
            }
            
            if (!placed_piece) {
                next_remaining.push_back(piece);
            }
        }
        remaining_pieces = next_remaining;
        if (remaining_pieces.empty()) break; 
    }
    
    return results;
}

PYBIND11_MODULE(raw_wood_engine, m) {
    m.doc() = "C++ Engine for Raw Wood Optimization";
    
    py::class_<Rect>(m, "Rect")
        .def(py::init<float, float, float, float>());
        
    py::class_<Piece>(m, "Piece")
        .def(py::init<int, float, float>());
        
    py::class_<Board>(m, "Board")
        .def(py::init<int, float, float, float, float, std::vector<Rect>>());
        
    py::class_<PlacementResult>(m, "PlacementResult")
        .def_readonly("piece_id", &PlacementResult::piece_id)
        .def_readonly("board_id", &PlacementResult::board_id)
        .def_readonly("x", &PlacementResult::x)
        .def_readonly("y", &PlacementResult::y)
        .def_readonly("w", &PlacementResult::w)
        .def_readonly("h", &PlacementResult::h)
        .def_readonly("rotated", &PlacementResult::rotated);
        
    m.def("find_best_position", &find_best_position, 
          "Find best placement for pieces sequentially on boards",
          py::arg("pieces"), py::arg("boards"), py::arg("kerf"), 
          py::arg("allow_transverse"), py::arg("resolution"));
}
