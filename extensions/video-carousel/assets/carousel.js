$(document).ready(function () {
  toastr.options = {
    closeButton: true,
    newestOnTop: false,
    progressBar: true,
    positionClass: "toast-top-right",
    preventDuplicates: false,
    onclick: null,
    showDuration: "300",
    hideDuration: "1000",
    timeOut: "5000",
    extendedTimeOut: "1000",
    showEasing: "swing",
    hideEasing: "linear",
    showMethod: "fadeIn",
    hideMethod: "fadeOut",
  };
  $(".video-carousle-slides").each(function () {
    const slide = $(this);
    // Ensure initial state on page load
    $(slide).find(".slide-content-minus-icon").hide();
    $(slide)
      .find(".variant-picker-addtocart")
      .addClass("variant-picker-opentoggle");

    $(slide)
      .find(".slide-content-plus-icon")
      .click(function (e) {
        const multiplevariant = $(this).attr("data-multiple-variant");
        if (multiplevariant === "false") {
          const product_selected_variant_id = $(this).attr(
            "data_single_variant_id",
          );
          addToCart(product_selected_variant_id);
        } else {
          const variantSelect = $(slide).find(".variant-picker-addtocart");
          const plusIcon = $(slide).find(".slide-content-plus-icon");
          const minusIcon = $(slide).find(".slide-content-minus-icon");

          if (variantSelect.hasClass("variant-picker-opentoggle")) {
            variantSelect.removeClass("variant-picker-opentoggle");
            plusIcon.hide();
            minusIcon.show();
          } else {
            variantSelect.addClass("variant-picker-opentoggle");
            plusIcon.show();
            minusIcon.hide();
          }
        }
      });

    $(slide)
      .find(".slide-content-minus-icon")
      .click(() => {
        const variantSelect = $(slide).find(".variant-picker-addtocart");
        const plusIcon = $(slide).find(".slide-content-plus-icon");
        const minusIcon = $(slide).find(".slide-content-minus-icon");
        variantSelect.addClass("variant-picker-opentoggle");
        plusIcon.show();
        minusIcon.hide();
      });

    const video = $(slide).find(".swiper-video");
    const toggleIcon = $(slide).find(".mute-toggle");

    video.get(0).addEventListener("click", () => {
      if (video.get(0).paused) {
        video.get(0).play();
      } else {
        video.get(0).pause();
      }
    });

    toggleIcon.get(0).addEventListener("click", () => {
      const mutedIcon = toggleIcon.find(".muted-icon");
      const unmutedIcon = toggleIcon.find(".unmuted-icon");

      if (video.get(0).muted) {
        video.get(0).muted = false;
        mutedIcon.addClass("hidden");
        unmutedIcon.removeClass("hidden");
      } else {
        video.get(0).muted = true;
        mutedIcon.removeClass("hidden");
        unmutedIcon.addClass("hidden");
      }
    });

    $(slide)
      .find(".variant-add-to-cart")
      .each(function () {
        const button = this;
        button.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          const variantId = button.getAttribute("data-variant-id");
          const productId = button.getAttribute("data-product-id");

          if (variantId) {
            addToCart(variantId);
          } else {
            console.error("No valid ID found for this product.");
          }
        });
      });

    function addToCart(id) {
      const cartdrawer = document.querySelector("cart-drawer");
      const items = {
        quantity: 1,
        id: id,
      };

      $.ajax({
        type: "POST",
        url: "/cart/add.js",
        data: items,
        dataType: "json",
        success: function (cartItem) {
          fetch("/?section_id=header")
            .then((response) => response.text())
            .then((html) => {
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = html;
              const updatedLink = tempDiv.querySelector("a[href='/cart']");

              if (updatedLink) {
                const existingLink = document.querySelector("a[href='/cart']");

                if (existingLink) {
                  existingLink.replaceWith(updatedLink);
                } else {
                  console.error(
                    "Existing <a> tag with href='/cart' not found.",
                  );
                }
              } else {
                console.error(
                  "Updated <a> tag with href='/cart' not found in fetched HTML.",
                );
              }
            })
            .catch((error) => console.error("Error fetching section:", error));
          toastr.success("Added to cart");
        },
        error: function (err) {
          toastr.error(
            err.responseJSON?.message ||
              err.responseJSON.description ||
              "Error while adding to the cart",
          );
        },
      });
    }

    let selectedValues = {};
    let recentlySelectedValue = {};
    let selectedVariantId = "";
    function updateOptions(slide) {
      function getGroupsFromDOM(slide) {
        const groups = {};
        slide.querySelectorAll(".option-btn").forEach((button) => {
          const groupName = button.dataset.optionName;
          const optionValue = button.dataset.name;
          if (!groups[groupName]) {
            groups[groupName] = [];
          }
          if (!groups[groupName].includes(optionValue)) {
            groups[groupName].push(optionValue);
          }
        });

        return groups;
      }

      const groups = getGroupsFromDOM(slide);
      const variants = $(".variant")
        .toArray()
        .map((el) => ({
          id: el.dataset.id,
          title: el.dataset.title,
          available: el.dataset.available === "true",
        }));

      const { combinations, secondaryCombination } = generateCombinations(
        groups,
        recentlySelectedValue,
        selectedValues,
      );
      // Continue with the function to update button states
      updateButtonStates(secondaryCombination, variants, slide);
      const activeSelection = getActiveSelection(slide);
      const activeselectedVariant = variants.find(
        (variant) => variant.title == activeSelection,
      );
      const selectedVariantprouductId = $(slide)
        .find(".product-add-to-cart button")
        .attr("data-product-id");

      if (activeselectedVariant) {
        selectedVariantId = activeselectedVariant.id;
        $(slide)
          .find(".variant-add-to-cart")
          .attr("disabled", false)
          .attr("data-variant-id", selectedVariantId);
      } else {
        console.log("No matching variant found.");
      }
    }

    function generateCombinations(
      groups,
      recentlySelectedValue,
      selectedValues,
    ) {
      const { group: recentlyGroup, value: recentlyValue } =
        recentlySelectedValue;
      selectedValues = selectedValues || {};
      const combinations = [];
      const secondaryCombination = [];
      const remainingGroups = Object.keys(groups).filter(
        (group) => !(group in selectedValues) && group !== recentlyGroup,
      );

      let selectedValueCombination = "";
      const values = Object.values(selectedValues);
      selectedValueCombination = values.join("/");

      const storedGroup = Object.keys(selectedValues).find(
        (group) => group !== recentlyGroup,
      );

      const storedGroupValue = selectedValues[storedGroup];
      if (storedGroupValue) {
        Object.entries(groups).forEach(([groupName, groupOptions]) => {
          if (groupName !== storedGroup) {
            groupOptions.forEach((option) => {
              const combination = `${storedGroupValue}/${option}`;
              secondaryCombination.push(combination);
            });
          }
        });
      }

      // If a stored group is found, combine with the recently selected value
      if (storedGroup) {
        const storedGroupOptions = groups[storedGroup];
        storedGroupOptions.forEach((option) => {
          const combination = `${recentlyValue}/${option}`;
          secondaryCombination.push(combination);
        });
      }

      remainingGroups.forEach((group) => {
        const groupOptions = groups[group];
        groupOptions.forEach((option) => {
          secondaryCombination.push(`${selectedValueCombination}/${option}`);
        });
      });

      return {
        combinations,
        secondaryCombination,
      };
    }

    function updateButtonStates(resultCombinations, variants, slide) {
      function isCombinationAvailable(combination, variants) {
        const [group, value] = combination.split("/");
        return variants.some(
          (variant) =>
            variant.title.includes(group) &&
            variant.title.includes(value) &&
            variant.available,
        );
      }

      const availabilityMap = {};
      console.log(resultCombinations, "result combination");

      resultCombinations.forEach((combination) => {
        const [primary, secondary] = combination.split("/");
        console.log(primary, secondary, "ps");
        if (!availabilityMap[primary]) {
          availabilityMap[primary] = { available: false, combinations: [] };
        }
        if (!availabilityMap[secondary]) {
          availabilityMap[secondary] = { available: false, combinations: [] };
        }

        const available = isCombinationAvailable(combination, variants);
        if (available) {
          availabilityMap[primary].available = true;
          availabilityMap[secondary].available = true;
        }
        availabilityMap[primary].combinations.push({ combination, available });
        availabilityMap[secondary].combinations.push({
          combination,
          available,
        });
      });

      // Update the DOM based on availabilityMap
      slide.querySelectorAll(".option-btn").forEach((button) => {
        const optionValue = button.dataset.name;
        const isAvailable = availabilityMap[optionValue]?.available;
        if (!isAvailable) {
          button.disabled = true;
          button.classList.add("disabled");
          button.classList.add("out-of-stock");
        } else {
          button.disabled = false;
          button.classList.remove("disabled");
          button.classList.remove("out-of-stock");
        }
      });
    }
    function getActiveSelection(slide) {
      const activeValues = [];
      $(slide)
        .find(".option-group")
        .each(function () {
          const groupName = $(this).data("option-group");
          const activeButton = $(this).find(".option-btn.active");

          if (activeButton.length) {
            const activeValue = activeButton.data("name");
            activeValues.push(activeValue);
          }
        });

      const selectionString = activeValues.join(" / ");
      return selectionString;
    }

    $(slide)
      .find(".option-btn")
      .click(function (e) {
        const $btn = $(this);

        const optionName = $btn
          .closest(".option-group")
          .find(".option-label")
          .data("option-name");
        const optionValue = $btn.data("name");
        $btn.closest(".option-group").find(".option-btn").removeClass("active");
        $btn.addClass("active");

        selectedValues[optionName] = optionValue;
        recentlySelectedValue = {
          group: optionName,
          value: optionValue,
        };
        const selectedSlide = $(slide);
        updateOptions(selectedSlide[0]);
      });
  });
});
