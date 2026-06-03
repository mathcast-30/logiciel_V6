from setuptools import setup
from pybind11.setup_helpers import Pybind11Extension, build_ext
import os

ext_modules = [
    Pybind11Extension(
        "raw_wood_engine",
        [os.path.join("Services", "IA_Engine", "raw_wood_optimizer", "raw_wood_engine.cpp")],
        language="c++",
        cxx_std=17,
    ),
]

setup(
    name="raw_wood_engine",
    version="1.0",
    description="C++ Engine for Raw Wood Optimizer",
    ext_modules=ext_modules,
    cmdclass={"build_ext": build_ext},
)
